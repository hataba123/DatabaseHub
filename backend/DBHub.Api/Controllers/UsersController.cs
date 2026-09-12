using System.Security.Claims;
using DBHub.Api.Data;
using DBHub.Api.DTOs;
using DBHub.Api.DTOs.Auth;
using DBHub.Api.Models.Auth;
using DBHub.Api.Security;
using DBHub.Api.Services.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DBHub.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly DBHubDbContext _context;
    private readonly IPermissionService _permissionService;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly IRefreshTokenService _refreshTokenService;
    private readonly IAuditService _auditService;
    private readonly ILogger<UsersController> _logger;

    public UsersController(
        DBHubDbContext context,
        IPermissionService permissionService,
        IPasswordHasher<User> passwordHasher,
        IRefreshTokenService refreshTokenService,
        IAuditService auditService,
        ILogger<UsersController> logger)
    {
        _context = context;
        _permissionService = permissionService;
        _passwordHasher = passwordHasher;
        _refreshTokenService = refreshTokenService;
        _auditService = auditService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<UserResponse>>> GetAll(CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.UserView, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to view users." });
        }

        var users = await _context.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync(cancellationToken);

        var response = users.Select(u => new UserResponse
        {
            Id = u.Id,
            Username = u.Username,
            DisplayName = u.DisplayName,
            Email = u.Email,
            IsActive = u.IsActive,
            CreatedAt = u.CreatedAt,
            LastLoginAt = u.LastLoginAt,
            Roles = u.UserRoles.Select(ur => ur.Role.Name).ToList()
        }).ToList();

        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<UserDetailResponse>> GetById(string id, CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.UserView, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to view user details." });
        }

        var user = await _context.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

        if (user == null)
        {
            return NotFound(new ErrorResponse { Code = "NOT_FOUND", Message = $"User with id '{id}' was not found." });
        }

        var effectivePermissions = await _permissionService.GetEffectivePermissionsAsync(user.Id, cancellationToken);

        return Ok(new UserDetailResponse
        {
            Id = user.Id,
            Username = user.Username,
            DisplayName = user.DisplayName,
            Email = user.Email,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt,
            Roles = user.UserRoles.Select(ur => ur.Role.Name).ToList(),
            EffectivePermissions = effectivePermissions
        });
    }

    [HttpPost]
    public async Task<ActionResult<UserResponse>> Create([FromBody] CreateUserRequest request, CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.UserManage, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to create users." });
        }

        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new ErrorResponse { Code = "VALIDATION_FAILED", Message = "Username and password are required." });
        }

        var username = request.Username.Trim();
        var exists = await _context.Users.AnyAsync(u => u.Username.ToLower() == username.ToLower(), cancellationToken);
        if (exists)
        {
            return BadRequest(new ErrorResponse { Code = "USER_EXISTS", Message = $"Username '{username}' is already taken." });
        }

        var user = new User
        {
            Id = Guid.NewGuid().ToString("N"),
            Username = username,
            DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? username : request.DisplayName.Trim(),
            Email = request.Email?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = User.Identity?.Name ?? "System"
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);

        _context.Users.Add(user);

        if (request.RoleIds != null && request.RoleIds.Count > 0)
        {
            var validRoleIds = await _context.Roles
                .Where(r => request.RoleIds.Contains(r.Id))
                .Select(r => r.Id)
                .ToListAsync(cancellationToken);

            foreach (var rId in validRoleIds)
            {
                _context.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = rId });
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        await _auditService.LogAuthEventAsync(currentUserId, User.Identity?.Name ?? "Unknown", "USER_CREATED", "User", user.Id, ip, true, new { user.Username, user.Email }, cancellationToken);

        var assignedRoles = await _context.UserRoles
            .Where(ur => ur.UserId == user.Id)
            .Select(ur => ur.Role.Name)
            .ToListAsync(cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = user.Id }, new UserResponse
        {
            Id = user.Id,
            Username = user.Username,
            DisplayName = user.DisplayName,
            Email = user.Email,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
            Roles = assignedRoles
        });
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<UserResponse>> Update(string id, [FromBody] UpdateUserRequest request, CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.UserManage, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to update users." });
        }

        var user = await _context.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

        if (user == null)
        {
            return NotFound(new ErrorResponse { Code = "NOT_FOUND", Message = $"User with id '{id}' was not found." });
        }

        user.DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? user.DisplayName : request.DisplayName.Trim();
        user.Email = request.Email?.Trim();
        user.UpdatedAt = DateTime.UtcNow;
        user.UpdatedBy = User.Identity?.Name;

        await _context.SaveChangesAsync(cancellationToken);

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        await _auditService.LogAuthEventAsync(currentUserId, User.Identity?.Name ?? "Unknown", "USER_UPDATED", "User", user.Id, ip, true, new { user.DisplayName, user.Email }, cancellationToken);

        return Ok(new UserResponse
        {
            Id = user.Id,
            Username = user.Username,
            DisplayName = user.DisplayName,
            Email = user.Email,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt,
            Roles = user.UserRoles.Select(ur => ur.Role.Name).ToList()
        });
    }

    [HttpPost("{id}/activate")]
    public async Task<IActionResult> Activate(string id, CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.UserManage, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to activate users." });
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (user == null)
        {
            return NotFound(new ErrorResponse { Code = "NOT_FOUND", Message = "User not found." });
        }

        user.IsActive = true;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        await _auditService.LogAuthEventAsync(currentUserId, User.Identity?.Name ?? "Unknown", "USER_ACTIVATED", "User", user.Id, ip, true, null, cancellationToken);

        return Ok(new { message = $"User '{user.Username}' activated successfully." });
    }

    [HttpPost("{id}/deactivate")]
    public async Task<IActionResult> Deactivate(string id, CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.UserManage, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to deactivate users." });
        }

        if (id == currentUserId)
        {
            return BadRequest(new ErrorResponse { Code = "CANNOT_DEACTIVATE_SELF", Message = "You cannot deactivate your own account." });
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (user == null)
        {
            return NotFound(new ErrorResponse { Code = "NOT_FOUND", Message = "User not found." });
        }

        user.IsActive = false;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        // Revoke all active sessions for this user
        await _refreshTokenService.RevokeAllForUserAsync(user.Id, cancellationToken);

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        await _auditService.LogAuthEventAsync(currentUserId, User.Identity?.Name ?? "Unknown", "USER_DEACTIVATED", "User", user.Id, ip, true, null, cancellationToken);

        return Ok(new { message = $"User '{user.Username}' deactivated successfully." });
    }

    [HttpPost("{id}/reset-password")]
    public async Task<IActionResult> ResetPassword(string id, [FromBody] ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.UserManage, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to reset passwords." });
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
        {
            return BadRequest(new ErrorResponse { Code = "WEAK_PASSWORD", Message = "Password must be at least 6 characters long." });
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (user == null)
        {
            return NotFound(new ErrorResponse { Code = "NOT_FOUND", Message = "User not found." });
        }

        user.PasswordHash = _passwordHasher.HashPassword(user, request.NewPassword);
        user.FailedLoginCount = 0;
        user.LockoutEnd = null;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        await _refreshTokenService.RevokeAllForUserAsync(user.Id, cancellationToken);

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        await _auditService.LogAuthEventAsync(currentUserId, User.Identity?.Name ?? "Unknown", "PASSWORD_RESET", "User", user.Id, ip, true, null, cancellationToken);

        return Ok(new { message = $"Password for user '{user.Username}' reset successfully." });
    }

    [HttpPut("{id}/roles")]
    public async Task<IActionResult> AssignRoles(string id, [FromBody] AssignRolesRequest request, CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.UserManage, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to assign roles." });
        }

        var user = await _context.Users.Include(u => u.UserRoles).FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (user == null)
        {
            return NotFound(new ErrorResponse { Code = "NOT_FOUND", Message = "User not found." });
        }

        var validRoles = await _context.Roles
            .Where(r => request.RoleIds.Contains(r.Id))
            .ToListAsync(cancellationToken);

        _context.UserRoles.RemoveRange(user.UserRoles);

        foreach (var r in validRoles)
        {
            _context.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = r.Id });
        }

        await _context.SaveChangesAsync(cancellationToken);

        // Invalidate cached effective permissions for this user
        _permissionService.InvalidateUserPermissionsCache(user.Id);

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        await _auditService.LogAuthEventAsync(currentUserId, User.Identity?.Name ?? "Unknown", "ROLES_ASSIGNED", "User", user.Id, ip, true, new { Roles = validRoles.Select(r => r.Name) }, cancellationToken);

        return Ok(new { message = "User roles updated successfully." });
    }
}
