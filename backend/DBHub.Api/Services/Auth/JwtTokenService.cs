using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using DBHub.Api.Models.Auth;
using Microsoft.IdentityModel.Tokens;

namespace DBHub.Api.Services.Auth;

public class JwtTokenService : IJwtTokenService
{
    private readonly byte[] _keyBytes;
    private readonly string _issuer;
    private readonly string _audience;
    private readonly int _expirationMinutes;

    public JwtTokenService(IConfiguration configuration)
    {
        var key = configuration["Jwt:Key"] ?? "DBHub_Enterprise_Secure_Key_2026_Min256Bits_MustBeLongEnough!";
        _keyBytes = Encoding.UTF8.GetBytes(key);
        _issuer = configuration["Jwt:Issuer"] ?? "DBHub";
        _audience = configuration["Jwt:Audience"] ?? "DBHubClient";
        _expirationMinutes = int.TryParse(configuration["Jwt:AccessTokenExpirationMinutes"], out var mins) ? mins : 15;
    }

    public int AccessTokenExpirationSeconds => _expirationMinutes * 60;

    public string GenerateAccessToken(User user, IEnumerable<string> roles)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.Name, user.Username),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
            new("displayName", user.DisplayName ?? user.Username)
        };

        if (!string.IsNullOrWhiteSpace(user.Email))
        {
            claims.Add(new(JwtRegisteredClaimNames.Email, user.Email));
        }

        foreach (var role in roles)
        {
            claims.Add(new(ClaimTypes.Role, role));
        }

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(_expirationMinutes),
            Issuer = _issuer,
            Audience = _audience,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(_keyBytes),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    public ClaimsPrincipal? GetPrincipalFromExpiredToken(string token)
    {
        var tokenValidationParameters = new TokenValidationParameters
        {
            ValidateAudience = true,
            ValidAudience = _audience,
            ValidateIssuer = true,
            ValidIssuer = _issuer,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(_keyBytes),
            ValidateLifetime = false
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        try
        {
            var principal = tokenHandler.ValidateToken(token, tokenValidationParameters, out var securityToken);
            if (securityToken is not JwtSecurityToken jwtSecurityToken ||
                !jwtSecurityToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256Signature, StringComparison.InvariantCultureIgnoreCase))
            {
                return null;
            }

            return principal;
        }
        catch
        {
            return null;
        }
    }
}
