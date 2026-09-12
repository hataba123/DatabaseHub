using System.Security.Cryptography;
using System.Text;
using DBHub.Api.Data;
using DBHub.Api.Models.Auth;
using Microsoft.EntityFrameworkCore;

namespace DBHub.Api.Services.Auth;

public class RefreshTokenService : IRefreshTokenService
{
    private readonly DBHubDbContext _context;
    private readonly int _expirationDays;
    private readonly ILogger<RefreshTokenService> _logger;

    public RefreshTokenService(DBHubDbContext context, IConfiguration configuration, ILogger<RefreshTokenService> logger)
    {
        _context = context;
        _logger = logger;
        _expirationDays = int.TryParse(configuration["Jwt:RefreshTokenExpirationDays"], out var days) ? days : 7;
    }

    public async Task<(string rawToken, RefreshToken tokenEntity)> CreateRefreshTokenAsync(
        string userId,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        var rawToken = GenerateSecureRandomString(64);
        var tokenHash = HashToken(rawToken);

        var entity = new RefreshToken
        {
            Id = Guid.NewGuid().ToString("N"),
            UserId = userId,
            TokenHash = tokenHash,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(_expirationDays),
            CreatedByIp = ipAddress
        };

        _context.RefreshTokens.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return (rawToken, entity);
    }

    public async Task<(string newRawToken, User user)?> ValidateAndRotateAsync(
        string rawToken,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(rawToken))
        {
            return null;
        }

        var tokenHash = HashToken(rawToken);
        var token = await _context.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash, cancellationToken);

        if (token == null)
        {
            return null;
        }

        // Replay attack detection: token was already revoked
        if (token.IsRevoked)
        {
            _logger.LogWarning("Replay attack detected on RefreshToken {Id} for user {UserId}. Revoking all tokens.", token.Id, token.UserId);
            await RevokeAllForUserAsync(token.UserId, cancellationToken);
            return null;
        }

        if (token.IsExpired || !token.User.IsActive)
        {
            return null;
        }

        // Revoke current token
        token.RevokedAt = DateTime.UtcNow;
        token.RevokedByIp = ipAddress;

        // Generate new token (Rotation)
        var newRawToken = GenerateSecureRandomString(64);
        var newTokenHash = HashToken(newRawToken);

        var newToken = new RefreshToken
        {
            Id = Guid.NewGuid().ToString("N"),
            UserId = token.UserId,
            TokenHash = newTokenHash,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(_expirationDays),
            CreatedByIp = ipAddress
        };

        token.ReplacedByTokenId = newToken.Id;

        _context.RefreshTokens.Add(newToken);
        await _context.SaveChangesAsync(cancellationToken);

        return (newRawToken, token.User);
    }

    public async Task<bool> RevokeTokenAsync(
        string rawToken,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(rawToken))
        {
            return false;
        }

        var tokenHash = HashToken(rawToken);
        var token = await _context.RefreshTokens.FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash, cancellationToken);
        if (token == null || token.IsRevoked)
        {
            return false;
        }

        token.RevokedAt = DateTime.UtcNow;
        token.RevokedByIp = ipAddress;
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task RevokeAllForUserAsync(string userId, CancellationToken cancellationToken = default)
    {
        var activeTokens = await _context.RefreshTokens
            .Where(rt => rt.UserId == userId && rt.RevokedAt == null)
            .ToListAsync(cancellationToken);

        foreach (var t in activeTokens)
        {
            t.RevokedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    private static string GenerateSecureRandomString(int bytesCount)
    {
        var bytes = RandomNumberGenerator.GetBytes(bytesCount);
        return Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_").TrimEnd('=');
    }

    public static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
