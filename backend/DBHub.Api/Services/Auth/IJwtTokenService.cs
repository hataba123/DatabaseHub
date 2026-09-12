using System.Security.Claims;
using DBHub.Api.Models.Auth;

namespace DBHub.Api.Services.Auth;

public interface IJwtTokenService
{
    string GenerateAccessToken(User user, IEnumerable<string> roles);
    ClaimsPrincipal? GetPrincipalFromExpiredToken(string token);
    int AccessTokenExpirationSeconds { get; }
}
