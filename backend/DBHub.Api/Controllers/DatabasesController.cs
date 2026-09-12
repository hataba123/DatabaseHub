using System.Security.Claims;
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
[Route("api/connections/{connectionId}/databases")]
[Authorize]
public class DatabasesController : ControllerBase
{
    private readonly IDatabaseConnectionStore _connectionStore;
    private readonly ISqlServerMetadataService _metadataService;
    private readonly IPermissionService _permissionService;

    public DatabasesController(
        IDatabaseConnectionStore connectionStore,
        ISqlServerMetadataService metadataService,
        IPermissionService permissionService)
    {
        _connectionStore = connectionStore;
        _metadataService = metadataService;
        _permissionService = permissionService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<DatabaseItem>>> GetDatabases(
        string connectionId,
        CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        var connectionScope = new ResourceScope { ConnectionId = connectionId };
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.ConnectionView, connectionScope, cancellationToken) &&
            !await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.DatabaseRead, connectionScope, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to view databases in this connection." });
        }

        var connection = await _connectionStore.GetByIdAsync(connectionId, cancellationToken);
        if (connection == null)
        {
            return NotFound(new ErrorResponse { Code = "NOT_FOUND", Message = $"Connection '{connectionId}' was not found." });
        }

        var databases = await _metadataService.GetDatabasesAsync(connection, cancellationToken);
        var allowedDatabases = await _permissionService.FilterDatabasesAsync(
            currentUserId,
            connectionId,
            databases,
            cancellationToken);

        return Ok(allowedDatabases);
    }
}
