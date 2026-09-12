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
[Route("api/connections/{connectionId}/databases/{database}")]
[Authorize]
public class MetadataController : ControllerBase
{
    private readonly IDatabaseConnectionStore _connectionStore;
    private readonly ISqlServerMetadataService _metadataService;
    private readonly IPermissionService _permissionService;

    public MetadataController(
        IDatabaseConnectionStore connectionStore,
        ISqlServerMetadataService metadataService,
        IPermissionService permissionService)
    {
        _connectionStore = connectionStore;
        _metadataService = metadataService;
        _permissionService = permissionService;
    }

    [HttpGet("tables")]
    public async Task<ActionResult<IReadOnlyList<TableItem>>> GetTables(
        string connectionId,
        string database,
        [FromQuery] string? q,
        CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();
        var connection = await GetConnectionOrThrowAsync(connectionId, cancellationToken);
        var tables = await _metadataService.GetTablesAsync(connection, database, q, cancellationToken);

        var filtered = await _permissionService.FilterTablesAsync(
            currentUserId,
            connectionId,
            database,
            tables,
            cancellationToken);

        return Ok(filtered);
    }

    [HttpGet("views")]
    public async Task<ActionResult<IReadOnlyList<ViewItem>>> GetViews(
        string connectionId,
        string database,
        CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();
        var scope = new ResourceScope(connectionId, database);
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.DatabaseRead, scope, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to view views in this database." });
        }

        var connection = await GetConnectionOrThrowAsync(connectionId, cancellationToken);
        var views = await _metadataService.GetViewsAsync(connection, database, cancellationToken);
        return Ok(views);
    }

    [HttpGet("procedures")]
    public async Task<ActionResult<IReadOnlyList<ProcedureItem>>> GetStoredProcedures(
        string connectionId,
        string database,
        CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();
        var scope = new ResourceScope(connectionId, database);
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.DatabaseRead, scope, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to view stored procedures in this database." });
        }

        var connection = await GetConnectionOrThrowAsync(connectionId, cancellationToken);
        var procs = await _metadataService.GetStoredProceduresAsync(connection, database, cancellationToken);
        return Ok(procs);
    }

    [HttpGet("tables/{schema}/{table}/columns")]
    public async Task<ActionResult<IReadOnlyList<ColumnItem>>> GetColumns(
        string connectionId,
        string database,
        string schema,
        string table,
        CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();
        var tableScope = new ResourceScope(connectionId, database, schema, table);
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.DatabaseRead, tableScope, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to view columns for this table." });
        }

        var connection = await GetConnectionOrThrowAsync(connectionId, cancellationToken);
        var cols = await _metadataService.GetColumnsAsync(connection, database, schema, table, cancellationToken);
        return Ok(cols);
    }

    [HttpGet("tables/{schema}/{table}/indexes")]
    public async Task<ActionResult<IReadOnlyList<IndexItem>>> GetIndexes(
        string connectionId,
        string database,
        string schema,
        string table,
        CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();
        var tableScope = new ResourceScope(connectionId, database, schema, table);
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.DatabaseRead, tableScope, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to view indexes for this table." });
        }

        var connection = await GetConnectionOrThrowAsync(connectionId, cancellationToken);
        var indexes = await _metadataService.GetIndexesAsync(connection, database, schema, table, cancellationToken);
        return Ok(indexes);
    }

    [HttpGet("tables/{schema}/{table}/relationships")]
    public async Task<ActionResult<IReadOnlyList<RelationshipItem>>> GetRelationships(
        string connectionId,
        string database,
        string schema,
        string table,
        CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();
        var tableScope = new ResourceScope(connectionId, database, schema, table);
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.DatabaseRead, tableScope, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to view relationships for this table." });
        }

        var connection = await GetConnectionOrThrowAsync(connectionId, cancellationToken);
        var rels = await _metadataService.GetRelationshipsAsync(connection, database, schema, table, cancellationToken);
        return Ok(rels);
    }

    private string GetCurrentUserId() => User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;

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
