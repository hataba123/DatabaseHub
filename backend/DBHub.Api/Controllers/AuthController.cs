using System.Security.Claims;
using DBHub.Api.Data;
using DBHub.Api.DTOs;
using DBHub.Api.DTOs.Auth;
using DBHub.Api.Models.Auth;
using DBHub.Api.Services.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DBHub.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly DBHubDbContext _context;
    private readonly IJwtTokenService _jwtService;
    private readonly IRefreshTokenService _refreshTokenService;
    private readonly IPermissionService _permissionService;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly IAuditService _auditService;
    private readonly ILogger<AuthController> _logger;

    private const string RefreshTokenCookieName = "dbhub_refresh_token";

    public AuthController(
        DBHubDbContext context,
        IJwtTokenService jwtService,
        IRefreshTokenService refreshTokenService,
        IPermissionService permissionService,
        IPasswordHasher<User> passwordHasher,
        IAuditService auditService,
        ILogger<AuthController> logger)
    {
        _context = context;
        _jwtService = jwtService;
        _refreshTokenService = refreshTokenService;
        _permissionService = permissionService;
        _passwordHasher = passwordHasher;
        _auditService = auditService;
        _logger = logger;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new ErrorResponse { Code = "VALIDATION_FAILED", Message = "Username and password are required." });
        }

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var user = await _context.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Username == request.Username.Trim(), cancellationToken);

        if (user == null)
        {
            await _auditService.LogAuthEventAsync(null, request.Username, "LOGIN_FAILED", "User", null, ip, false, new { Reason = "UserNotFound" }, cancellationToken);
            return Unauthorized(new ErrorResponse { Code = "INVALID_CREDENTIALS", Message = "Invalid username or password." });
        }

        if (!user.IsActive)
        {
            await _auditService.LogAuthEventAsync(user.Id, user.Username, "LOGIN_FAILED", "User", user.Id, ip, false, new { Reason = "UserDeactivated" }, cancellationToken);
            return StatusCode(403, new ErrorResponse { Code = "ACCOUNT_DEACTIVATED", Message = "Account has been deactivated. Please contact an administrator." });
        }

        // Check lockout
        if (user.LockoutEnd.HasValue && user.LockoutEnd.Value > DateTimeOffset.UtcNow)
        {
            var remaining = Math.Ceiling((user.LockoutEnd.Value - DateTimeOffset.UtcNow).TotalMinutes);
            await _auditService.LogAuthEventAsync(user.Id, user.Username, "LOGIN_FAILED", "User", user.Id, ip, false, new { Reason = "AccountLocked" }, cancellationToken);
            return StatusCode(423, new ErrorResponse
            {
                Code = "ACCOUNT_LOCKED",
                Message = $"Account is temporarily locked out due to multiple failed login attempts. Please try again in {remaining} minute(s)."
            });
        }

        var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (result == PasswordVerificationResult.Failed)
        {
            user.FailedLoginCount++;
            if (user.FailedLoginCount >= 5)
            {
                user.LockoutEnd = DateTimeOffset.UtcNow.AddMinutes(15);
                _logger.LogWarning("User {Username} locked out until {LockoutEnd} due to failed attempts", user.Username, user.LockoutEnd);
            }
            await _context.SaveChangesAsync(cancellationToken);

            await _auditService.LogAuthEventAsync(user.Id, user.Username, "LOGIN_FAILED", "User", user.Id, ip, false, new { Reason = "InvalidPassword", FailedCount = user.FailedLoginCount }, cancellationToken);
            return Unauthorized(new ErrorResponse { Code = "INVALID_CREDENTIALS", Message = "Invalid username or password." });
        }

        // Reset failed login state & update login time
        user.FailedLoginCount = 0;
        user.LockoutEnd = null;
        user.LastLoginAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();
        var accessToken = _jwtService.GenerateAccessToken(user, roles);

        var (rawRefreshToken, _) = await _refreshTokenService.CreateRefreshTokenAsync(user.Id, ip, cancellationToken);
        SetRefreshTokenCookie(rawRefreshToken, request.RememberMe);

        await _auditService.LogAuthEventAsync(user.Id, user.Username, "LOGIN_SUCCESS", "User", user.Id, ip, true, null, cancellationToken);

        return Ok(new LoginResponse
        {
            User = new AuthUserDto
            {
                Id = user.Id,
                Username = user.Username,
                DisplayName = user.DisplayName,
                Email = user.Email,
                Roles = roles
            },
            AccessToken = accessToken,
            ExpiresIn = _jwtService.AccessTokenExpirationSeconds
        });
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<ActionResult<RefreshTokenResponse>> Refresh(CancellationToken cancellationToken)
    {
        if (!Request.Cookies.TryGetValue(RefreshTokenCookieName, out var rawRefreshToken) || string.IsNullOrWhiteSpace(rawRefreshToken))
        {
            return Unauthorized(new ErrorResponse { Code = "UNAUTHORIZED", Message = "Refresh token is missing." });
        }

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var rotated = await _refreshTokenService.ValidateAndRotateAsync(rawRefreshToken, ip, cancellationToken);
        if (rotated == null)
        {
            ClearRefreshTokenCookie();
            return Unauthorized(new ErrorResponse { Code = "UNAUTHORIZED", Message = "Refresh token is invalid or expired." });
        }

        var (newRawToken, user) = rotated.Value;
        SetRefreshTokenCookie(newRawToken, true);

        var roles = await _context.UserRoles
            .Where(ur => ur.UserId == user.Id)
            .Select(ur => ur.Role.Name)
            .ToListAsync(cancellationToken);

        var newAccessToken = _jwtService.GenerateAccessToken(user, roles);

        return Ok(new RefreshTokenResponse
        {
            AccessToken = newAccessToken,
            ExpiresIn = _jwtService.AccessTokenExpirationSeconds
        });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var username = User.Identity?.Name ?? "Anonymous";

        if (Request.Cookies.TryGetValue(RefreshTokenCookieName, out var rawRefreshToken))
        {
            await _refreshTokenService.RevokeTokenAsync(rawRefreshToken, ip, cancellationToken);
        }

        ClearRefreshTokenCookie();
        await _auditService.LogAuthEventAsync(userId, username, "LOGOUT", "User", userId, ip, true, null, cancellationToken);

        return Ok(new { message = "Logged out successfully." });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<CurrentUserResponse>> GetCurrentUser(CancellationToken cancellationToken)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized(new ErrorResponse { Code = "UNAUTHORIZED", Message = "User token is invalid." });
        }

        var user = await _context.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

        if (user == null || !user.IsActive)
        {
            return Unauthorized(new ErrorResponse { Code = "UNAUTHORIZED", Message = "User not found or inactive." });
        }

        var roles = user.UserRoles.Select(ur => ur.Role.Name).ToList();
        var permissions = await _permissionService.GetEffectivePermissionsAsync(user.Id, cancellationToken);

        return Ok(new CurrentUserResponse
        {
            Id = user.Id,
            Username = user.Username,
            DisplayName = user.DisplayName,
            Email = user.Email,
            Roles = roles,
            Permissions = permissions
        });
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(
        [FromBody] ChangePasswordRequest request,
        CancellationToken cancellationToken)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrWhiteSpace(userId))
        {
            return Unauthorized();
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null)
        {
            return NotFound(new ErrorResponse { Code = "NOT_FOUND", Message = "User not found." });
        }

        var verify = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.CurrentPassword);
        if (verify == PasswordVerificationResult.Failed)
        {
            return BadRequest(new ErrorResponse { Code = "INVALID_PASSWORD", Message = "Current password is incorrect." });
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
        {
            return BadRequest(new ErrorResponse { Code = "WEAK_PASSWORD", Message = "New password must be at least 6 characters long." });
        }

        user.PasswordHash = _passwordHasher.HashPassword(user, request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        await _refreshTokenService.RevokeAllForUserAsync(user.Id, cancellationToken);
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        await _auditService.LogAuthEventAsync(user.Id, user.Username, "PASSWORD_CHANGED", "User", user.Id, ip, true, null, cancellationToken);

        return Ok(new { message = "Password changed successfully. Please login again with your new password." });
    }

    private void SetRefreshTokenCookie(string token, bool rememberMe)
    {
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Expires = rememberMe ? DateTime.UtcNow.AddDays(7) : (DateTime?)null
        };

        Response.Cookies.Append(RefreshTokenCookieName, token, cookieOptions);
    }

    private void ClearRefreshTokenCookie()
    {
        Response.Cookies.Delete(RefreshTokenCookieName, new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Lax
        });
    }
}
