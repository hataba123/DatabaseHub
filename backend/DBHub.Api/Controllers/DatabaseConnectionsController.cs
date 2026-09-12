using System.Diagnostics;
using System.Security.Claims;
using Dapper;
using DBHub.Api.DTOs;
using DBHub.Api.Models;
using DBHub.Api.Repositories;
using DBHub.Api.Security;
using DBHub.Api.Services;
using DBHub.Api.Services.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DBHub.Api.Controllers;

[ApiController]
[Route("api/database-connections")]
[Authorize]
public class DatabaseConnectionsController : ControllerBase
{
    private readonly IDatabaseConnectionStore _connectionStore;
    private readonly ISqlConnectionFactory _connectionFactory;
    private readonly IPermissionService _permissionService;
    private readonly ILogger<DatabaseConnectionsController> _logger;

    public DatabaseConnectionsController(
        IDatabaseConnectionStore connectionStore,
        ISqlConnectionFactory connectionFactory,
        IPermissionService permissionService,
        ILogger<DatabaseConnectionsController> logger)
    {
        _connectionStore = connectionStore;
        _connectionFactory = connectionFactory;
        _permissionService = permissionService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ConnectionResponse>>> GetAll(CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.ConnectionView, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to view database connections." });
        }

        var connections = await _connectionStore.GetAllAsync(cancellationToken);
        var response = connections.Select(c => ToResponse(c)).ToList();
        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ConnectionResponse>> GetById(string id, CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.ConnectionView, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to view database connections." });
        }
        var conn = await _connectionStore.GetByIdAsync(id, cancellationToken);
        if (conn == null)
        {
            return NotFound(new ErrorResponse { Code = "NOT_FOUND", Message = $"Connection with id '{id}' was not found." });
        }
        return Ok(ToResponse(conn));
    }

    [HttpPost]
    public async Task<ActionResult<ConnectionResponse>> Create(
        [FromBody] CreateConnectionRequest request,
        CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.ConnectionManage, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to manage database connections." });
        }

        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Server))
        {
            return BadRequest(new ErrorResponse { Code = "VALIDATION_FAILED", Message = "Connection name and server host are required." });
        }

        var conn = new DatabaseConnection
        {
            Id = Guid.NewGuid().ToString("N"),
            Name = request.Name.Trim(),
            Environment = request.Environment,
            Server = request.Server.Trim(),
            Port = request.Port > 0 ? request.Port : 1433,
            Database = request.Database?.Trim() ?? string.Empty,
            AuthenticationType = request.AuthenticationType,
            Username = request.Username?.Trim(),
            Password = request.Password,
            Encrypt = request.Encrypt,
            TrustServerCertificate = request.TrustServerCertificate,
            IsEnabled = true,
            Status = "Online",
            CreatedAt = DateTime.UtcNow
        };

        var saved = await _connectionStore.SaveAsync(conn, cancellationToken);
        _logger.LogInformation("Created new database connection configuration: {Name} ({Server})", saved.Name, saved.Server);

        return CreatedAtAction(nameof(GetById), new { id = saved.Id }, ToResponse(saved));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.ConnectionManage, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to manage database connections." });
        }

        var deleted = await _connectionStore.DeleteAsync(id, cancellationToken);
        if (!deleted)
        {
            return NotFound(new ErrorResponse { Code = "NOT_FOUND", Message = $"Connection with id '{id}' was not found." });
        }
        return NoContent();
    }

    [HttpPost("{id}/test")]
    public async Task<ActionResult<TestConnectionResponse>> TestSavedConnection(
        string id,
        CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.ConnectionManage, null, cancellationToken))
        {
            return StatusCode(403, new TestConnectionResponse { Success = false, Message = "You do not have permission to test database connections." });
        }

        var conn = await _connectionStore.GetByIdAsync(id, cancellationToken);
        if (conn == null)
        {
            return NotFound(new ErrorResponse { Code = "NOT_FOUND", Message = $"Connection with id '{id}' was not found." });
        }

        var sw = Stopwatch.StartNew();
        try
        {
            await using var sqlConn = _connectionFactory.CreateConnection(conn);
            await sqlConn.OpenAsync(cancellationToken);

            var info = await sqlConn.QueryFirstOrDefaultAsync<dynamic>(
                new CommandDefinition(
                    "SELECT @@VERSION AS ServerVersion, DB_NAME() AS CurrentDb;",
                    commandTimeout: 5,
                    cancellationToken: cancellationToken));

            sw.Stop();

            string versionStr = info?.ServerVersion ?? "SQL Server";
            string firstLineVersion = versionStr.Split('\n')[0].Trim();

            return Ok(new TestConnectionResponse
            {
                Success = true,
                ServerVersion = firstLineVersion,
                Database = info?.CurrentDb ?? conn.Database,
                ElapsedMilliseconds = sw.ElapsedMilliseconds,
                Message = "Connection successful."
            });
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogWarning(ex, "Test connection failed for saved connection {Id} ({Server})", id, conn.Server);

            return Ok(new TestConnectionResponse
            {
                Success = false,
                ElapsedMilliseconds = sw.ElapsedMilliseconds,
                Message = $"Unable to connect to database: {ex.Message}"
            });
        }
    }

    [HttpPost("test")]
    public async Task<ActionResult<TestConnectionResponse>> TestConnection(
        [FromBody] TestConnectionRequest request,
        CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.ConnectionManage, null, cancellationToken))
        {
            return StatusCode(403, new TestConnectionResponse { Success = false, Message = "You do not have permission to test database connections." });
        }
        if (string.IsNullOrWhiteSpace(request.Server))
        {
            return BadRequest(new TestConnectionResponse
            {
                Success = false,
                Message = "Server host is required."
            });
        }

        var dummyConn = new DatabaseConnection
        {
            Server = request.Server,
            Port = request.Port,
            Database = request.Database,
            AuthenticationType = request.AuthenticationType,
            Username = request.Username,
            Password = request.Password,
            Encrypt = request.Encrypt,
            TrustServerCertificate = request.TrustServerCertificate
        };

        var sw = Stopwatch.StartNew();
        try
        {
            await using var conn = _connectionFactory.CreateConnection(dummyConn);
            await conn.OpenAsync(cancellationToken);

            var info = await conn.QueryFirstOrDefaultAsync<dynamic>(
                new CommandDefinition(
                    "SELECT @@VERSION AS ServerVersion, DB_NAME() AS CurrentDb;",
                    commandTimeout: 5,
                    cancellationToken: cancellationToken));

            sw.Stop();

            string versionStr = info?.ServerVersion ?? "SQL Server";
            string firstLineVersion = versionStr.Split('\n')[0].Trim();

            return Ok(new TestConnectionResponse
            {
                Success = true,
                ServerVersion = firstLineVersion,
                Database = info?.CurrentDb ?? request.Database,
                ElapsedMilliseconds = sw.ElapsedMilliseconds,
                Message = "Connection successful."
            });
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogWarning(ex, "Test connection failed for server {Server}", request.Server);

            return Ok(new TestConnectionResponse
            {
                Success = false,
                ElapsedMilliseconds = sw.ElapsedMilliseconds,
                Message = $"Unable to connect to database: {ex.Message}"
            });
        }
    }

    private static ConnectionResponse ToResponse(DatabaseConnection c)
    {
        return new ConnectionResponse
        {
            Id = c.Id,
            Name = c.Name,
            Environment = c.Environment,
            Server = c.Server,
            Port = c.Port,
            Database = c.Database,
            AuthenticationType = c.AuthenticationType.ToString(),
            Username = c.Username,
            Encrypt = c.Encrypt,
            TrustServerCertificate = c.TrustServerCertificate,
            IsEnabled = c.IsEnabled,
            Status = c.Status,
            CreatedAt = c.CreatedAt
        };
    }
}
