using DBHub.Api.Models.Auth;

namespace DBHub.Api.Services.Auth;

public interface IRefreshTokenService
{
    Task<(string rawToken, RefreshToken tokenEntity)> CreateRefreshTokenAsync(string userId, string? ipAddress, CancellationToken cancellationToken = default);
    Task<(string newRawToken, User user)?> ValidateAndRotateAsync(string rawToken, string? ipAddress, CancellationToken cancellationToken = default);
    Task<bool> RevokeTokenAsync(string rawToken, string? ipAddress, CancellationToken cancellationToken = default);
    Task RevokeAllForUserAsync(string userId, CancellationToken cancellationToken = default);
}
