using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using DBHub.Api.Data;
using DBHub.Api.Models.Auth;
using DBHub.Api.Services.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace DBHub.Tests;

public class AuthTests : IDisposable
{
    private readonly SqliteConnection _sqliteConnection;
    private readonly DBHubDbContext _context;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly IConfiguration _configuration;
    private readonly JwtTokenService _jwtService;
    private readonly RefreshTokenService _refreshTokenService;

    public AuthTests()
    {
        _sqliteConnection = new SqliteConnection("DataSource=:memory:");
        _sqliteConnection.Open();

        var options = new DbContextOptionsBuilder<DBHubDbContext>()
            .UseSqlite(_sqliteConnection)
            .Options;

        _context = new DBHubDbContext(options);
        _context.Database.EnsureCreated();

        _passwordHasher = new PasswordHasher<User>();

        var configValues = new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "SecretKeyForTestingAuthTokensMustBeLongEnough1234567890!",
            ["Jwt:Issuer"] = "DBHubTest",
            ["Jwt:Audience"] = "DBHubClientTest",
            ["Jwt:AccessTokenExpirationMinutes"] = "15",
            ["Jwt:RefreshTokenExpirationDays"] = "7"
        };
        _configuration = new ConfigurationBuilder().AddInMemoryCollection(configValues).Build();

        _jwtService = new JwtTokenService(_configuration);
        _refreshTokenService = new RefreshTokenService(_context, _configuration, NullLogger<RefreshTokenService>.Instance);
    }

    public void Dispose()
    {
        _context.Dispose();
        _sqliteConnection.Dispose();
    }

    [Fact]
    public void PasswordHasher_HashesAndVerifiesPasswordCorrectly()
    {
        var user = new User { Id = "u-1", Username = "tester" };
        var rawPassword = "SecurePassword@2026";

        var hash = _passwordHasher.HashPassword(user, rawPassword);
        Assert.NotEmpty(hash);
        Assert.NotEqual(rawPassword, hash);

        var verifySuccess = _passwordHasher.VerifyHashedPassword(user, hash, rawPassword);
        Assert.Equal(PasswordVerificationResult.Success, verifySuccess);

        var verifyFail = _passwordHasher.VerifyHashedPassword(user, hash, "WrongPassword");
        Assert.Equal(PasswordVerificationResult.Failed, verifyFail);
    }

    [Fact]
    public void JwtTokenService_GeneratesValidToken_WithExpectedClaims()
    {
        var user = new User
        {
            Id = "u-jwt-1",
            Username = "jwtuser",
            Email = "jwt@dbhub.test",
            DisplayName = "JWT User"
        };
        var roles = new[] { "Super Admin", "Data Editor" };

        var tokenString = _jwtService.GenerateAccessToken(user, roles);
        Assert.NotEmpty(tokenString);

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(tokenString);

        Assert.Equal(user.Id, jwt.Claims.First(c => c.Type == JwtRegisteredClaimNames.Sub).Value);
        Assert.Equal(user.Username, jwt.Claims.First(c => c.Type == JwtRegisteredClaimNames.Name).Value);
        Assert.Equal(user.Email, jwt.Claims.First(c => c.Type == JwtRegisteredClaimNames.Email).Value);
        Assert.Equal(user.DisplayName, jwt.Claims.First(c => c.Type == "displayName").Value);

        var roleClaims = jwt.Claims
            .Where(c => c.Type == "role" || c.Type == ClaimTypes.Role)
            .Select(c => c.Value)
            .ToList();
        Assert.Contains("Super Admin", roleClaims);
        Assert.Contains("Data Editor", roleClaims);
    }

    [Fact]
    public async Task RefreshTokenService_GenerateAndRotate_Success()
    {
        var user = new User
        {
            Id = "u-rt-1",
            Username = "rtuser",
            IsActive = true
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // 1. Generate initial token
        var (rawToken, tokenEntity) = await _refreshTokenService.CreateRefreshTokenAsync(
            user.Id,
            ipAddress: "127.0.0.1");

        Assert.NotEmpty(rawToken);
        Assert.NotNull(tokenEntity);
        Assert.NotEmpty(tokenEntity.TokenHash);

        var savedToken = await _context.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == tokenEntity.TokenHash);
        Assert.NotNull(savedToken);
        Assert.False(savedToken.IsRevoked);

        // 2. Rotate token
        var rotateResult = await _refreshTokenService.ValidateAndRotateAsync(
            rawToken,
            ipAddress: "127.0.0.1");

        Assert.NotNull(rotateResult);
        Assert.NotNull(rotateResult.Value.user);
        Assert.Equal(user.Id, rotateResult.Value.user.Id);
        Assert.NotEmpty(rotateResult.Value.newRawToken);
        Assert.NotEqual(rawToken, rotateResult.Value.newRawToken);

        // Old token should now be marked as revoked/replaced
        var oldTokenRecord = await _context.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == tokenEntity.TokenHash);
        Assert.NotNull(oldTokenRecord);
        Assert.True(oldTokenRecord.IsRevoked);
        Assert.NotNull(oldTokenRecord.ReplacedByTokenId);
    }

    [Fact]
    public async Task RefreshTokenService_ReplayAttack_RevokesTokenFamily()
    {
        var user = new User
        {
            Id = "u-replay-1",
            Username = "replayuser",
            IsActive = true
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // 1. Create first token
        var (rawToken1, _) = await _refreshTokenService.CreateRefreshTokenAsync(user.Id, "127.0.0.1");

        // 2. Rotate once legitimately
        var rotateResult = await _refreshTokenService.ValidateAndRotateAsync(rawToken1, "127.0.0.1");
        Assert.NotNull(rotateResult);

        // 3. Replay attack: try to rotate using rawToken1 again!
        var replayResult = await _refreshTokenService.ValidateAndRotateAsync(rawToken1, "192.168.1.100");

        // Replay should fail (returns null)
        Assert.Null(replayResult);

        // All tokens in the user's family must be revoked
        var allTokens = await _context.RefreshTokens.Where(t => t.UserId == user.Id).ToListAsync();
        Assert.NotEmpty(allTokens);
        Assert.All(allTokens, t => Assert.True(t.IsRevoked));
    }

    [Fact]
    public async Task RefreshTokenService_Revoke_MarksTokenRevoked()
    {
        var user = new User
        {
            Id = "u-rev-1",
            Username = "revuser",
            IsActive = true
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var (rawToken, tokenEntity) = await _refreshTokenService.CreateRefreshTokenAsync(user.Id, null);
        var revoked = await _refreshTokenService.RevokeTokenAsync(rawToken, "127.0.0.1");
        Assert.True(revoked);

        var tokenRecord = await _context.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == tokenEntity.TokenHash);
        Assert.NotNull(tokenRecord);
        Assert.True(tokenRecord.IsRevoked);
    }
}
