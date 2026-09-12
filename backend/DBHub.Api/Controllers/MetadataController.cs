using DBHub.Api.DTOs;
using DBHub.Api.Models;
using DBHub.Api.Repositories;
using DBHub.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace DBHub.Api.Controllers;

[ApiController]
[Route("api/connections/{connectionId}/databases/{database}")]
public class MetadataController : ControllerBase
{
    private readonly IDatabaseConnectionStore _connectionStore;
    private readonly ISqlServerMetadataService _metadataService;

    public MetadataController(
        IDatabaseConnectionStore connectionStore,
        ISqlServerMetadataService metadataService)
    {
        _connectionStore = connectionStore;
        _metadataService = metadataService;
    }

    [HttpGet("tables")]
    public async Task<ActionResult<IReadOnlyList<TableItem>>> GetTables(
        string connectionId,
        string database,
        [FromQuery] string? q,
        CancellationToken cancellationToken)
    {
        var connection = await GetConnectionOrThrowAsync(connectionId, cancellationToken);
        var tables = await _metadataService.GetTablesAsync(connection, database, q, cancellationToken);
        return Ok(tables);
    }

    [HttpGet("views")]
    public async Task<ActionResult<IReadOnlyList<ViewItem>>> GetViews(
        string connectionId,
        string database,
        CancellationToken cancellationToken)
    {
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
        var connection = await GetConnectionOrThrowAsync(connectionId, cancellationToken);
        var rels = await _metadataService.GetRelationshipsAsync(connection, database, schema, table, cancellationToken);
        return Ok(rels);
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
