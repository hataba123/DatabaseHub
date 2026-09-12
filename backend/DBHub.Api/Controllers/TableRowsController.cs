using System.Security.Claims;
using System.Text.Json;
using DBHub.Api.DTOs;
using DBHub.Api.Models;
using DBHub.Api.Repositories;
using DBHub.Api.Security;
using DBHub.Api.Services.Auth;
using DBHub.Api.Services.Crud;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DBHub.Api.Controllers;

[ApiController]
[Route("api/connections/{connectionId}/databases/{database}/tables/{schema}/{table}")]
[Authorize]
public class TableRowsController : ControllerBase
{
    private readonly IDatabaseConnectionStore _connectionStore;
    private readonly IDynamicCrudService _crudService;
    private readonly IPermissionService _permissionService;
    private readonly ILogger<TableRowsController> _logger;

    public TableRowsController(
        IDatabaseConnectionStore connectionStore,
        IDynamicCrudService crudService,
        IPermissionService permissionService,
        ILogger<TableRowsController> logger)
    {
        _connectionStore = connectionStore;
        _crudService = crudService;
        _permissionService = permissionService;
        _logger = logger;
    }

    [HttpGet("capabilities")]
    public async Task<ActionResult<TableCapabilitiesResponse>> GetCapabilities(
        string connectionId,
        string database,
        string schema,
        string table,
        CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        var tableScope = new ResourceScope(connectionId, database, schema, table);

        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.DatabaseRead, tableScope, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to access this table." });
        }

        var connection = await GetConnectionOrThrowAsync(connectionId, cancellationToken);
        var capabilities = await _crudService.GetCapabilitiesAsync(connection, database, schema, table, cancellationToken);

        // Adjust capabilities based on user's effective RBAC permissions
        var canInsert = capabilities.CanInsert && await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.DatabaseInsert, tableScope, cancellationToken);
        var canUpdate = capabilities.CanUpdate && await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.DatabaseUpdate, tableScope, cancellationToken);
        var canDelete = capabilities.CanDelete && await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.DatabaseDelete, tableScope, cancellationToken);

        capabilities.CanInsert = canInsert;
        capabilities.CanUpdate = canUpdate;
        capabilities.CanDelete = canDelete;

        return Ok(capabilities);
    }

    [HttpPost("rows/by-key")]
    public async Task<ActionResult<IDictionary<string, object?>>> GetRowByKey(
        string connectionId,
        string database,
        string schema,
        string table,
        [FromBody] Dictionary<string, object?> keys,
        CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        var tableScope = new ResourceScope(connectionId, database, schema, table);

        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.DatabaseRead, tableScope, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to view data in this table." });
        }

        var connection = await GetConnectionOrThrowAsync(connectionId, cancellationToken);
        var row = await _crudService.GetRowByKeyAsync(connection, database, schema, table, keys, cancellationToken);

        if (row == null)
        {
            return NotFound(new ErrorResponse { Code = "ROW_NOT_FOUND", Message = "Specified row was not found." });
        }

        return Ok(row);
    }

    [HttpPost("rows")]
    public async Task<ActionResult<RowOperationResult>> CreateRow(
        string connectionId,
        string database,
        string schema,
        string table,
        [FromBody] CreateRowRequest request,
        CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        var currentUsername = User.FindFirst(ClaimTypes.Name)?.Value ?? currentUserId;
        var tableScope = new ResourceScope(connectionId, database, schema, table);

        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.DatabaseInsert, tableScope, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to insert rows into this table." });
        }

        var connection = await GetConnectionOrThrowAsync(connectionId, cancellationToken);
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();

        var result = await _crudService.CreateRowAsync(
            connection,
            database,
            schema,
            table,
            request,
            currentUserId,
            currentUsername,
            ipAddress,
            cancellationToken);

        return StatusCode(201, result);
    }

    [HttpPut("rows")]
    public async Task<ActionResult<RowOperationResult>> UpdateRow(
        string connectionId,
        string database,
        string schema,
        string table,
        [FromBody] UpdateRowRequest request,
        CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        var currentUsername = User.FindFirst(ClaimTypes.Name)?.Value ?? currentUserId;
        var tableScope = new ResourceScope(connectionId, database, schema, table);

        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.DatabaseUpdate, tableScope, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to update rows in this table." });
        }

        var connection = await GetConnectionOrThrowAsync(connectionId, cancellationToken);
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();

        var result = await _crudService.UpdateRowAsync(
            connection,
            database,
            schema,
            table,
            request,
            currentUserId,
            currentUsername,
            ipAddress,
            cancellationToken);

        return Ok(result);
    }

    [HttpDelete("rows")]
    public async Task<ActionResult<RowOperationResult>> DeleteRow(
        string connectionId,
        string database,
        string schema,
        string table,
        [FromBody] DeleteRowRequest request,
        CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        var currentUsername = User.FindFirst(ClaimTypes.Name)?.Value ?? currentUserId;
        var tableScope = new ResourceScope(connectionId, database, schema, table);

        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.DatabaseDelete, tableScope, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to delete rows from this table." });
        }

        var connection = await GetConnectionOrThrowAsync(connectionId, cancellationToken);
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();

        var result = await _crudService.DeleteRowAsync(
            connection,
            database,
            schema,
            table,
            request,
            currentUserId,
            currentUsername,
            ipAddress,
            cancellationToken);

        return Ok(result);
    }

    [HttpPost("rows/bulk-delete")]
    public async Task<ActionResult<BulkOperationResult>> BulkDeleteRows(
        string connectionId,
        string database,
        string schema,
        string table,
        [FromBody] BulkDeleteRequest request,
        CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        var currentUsername = User.FindFirst(ClaimTypes.Name)?.Value ?? currentUserId;
        var tableScope = new ResourceScope(connectionId, database, schema, table);

        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.DatabaseDelete, tableScope, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to bulk delete rows from this table." });
        }

        var connection = await GetConnectionOrThrowAsync(connectionId, cancellationToken);
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();

        var result = await _crudService.BulkDeleteRowsAsync(
            connection,
            database,
            schema,
            table,
            request,
            currentUserId,
            currentUsername,
            ipAddress,
            cancellationToken);

        return Ok(result);
    }

    [HttpGet("lookups/{column}")]
    public async Task<ActionResult<IReadOnlyList<LookupItemDto>>> GetLookups(
        string connectionId,
        string database,
        string schema,
        string table,
        string column,
        [FromQuery] int top = 50,
        CancellationToken cancellationToken = default)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        var tableScope = new ResourceScope(connectionId, database, schema, table);

        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.DatabaseRead, tableScope, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to view data in this table." });
        }

        var connection = await GetConnectionOrThrowAsync(connectionId, cancellationToken);
        var lookups = await _crudService.GetLookupValuesAsync(connection, database, schema, table, column, top, cancellationToken);
        return Ok(lookups);
    }

    [HttpGet("rows/history")]
    public async Task<ActionResult<IReadOnlyList<RowAuditHistoryItem>>> GetRowAuditHistory(
        string connectionId,
        string database,
        string schema,
        string table,
        [FromQuery] string? targetId = null,
        CancellationToken cancellationToken = default)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        var tableScope = new ResourceScope(connectionId, database, schema, table);

        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.AuditView, null, cancellationToken) &&
            !await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.DatabaseRead, tableScope, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to view audit history for this table." });
        }

        var history = await _crudService.GetRowAuditHistoryAsync(database, schema, table, targetId, cancellationToken);
        return Ok(history);
    }

    private async Task<DatabaseConnection> GetConnectionOrThrowAsync(string connectionId, CancellationToken cancellationToken)
    {
        var conn = await _connectionStore.GetByIdAsync(connectionId, cancellationToken);
        if (conn == null)
        {
            throw new KeyNotFoundException($"Connection with id '{connectionId}' was not found.");
        }
        return conn;
    }
}
