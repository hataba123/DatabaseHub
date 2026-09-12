using System.Security.Claims;
using System.Text.Json;
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
[Route("api/connections/{connectionId}/databases/{database}/tables/{schema}/{table}/rows")]
[Authorize]
public class TableDataController : ControllerBase
{
    private readonly IDatabaseConnectionStore _connectionStore;
    private readonly ITableDataQueryService _queryService;
    private readonly IPermissionService _permissionService;
    private readonly ILogger<TableDataController> _logger;

    public TableDataController(
        IDatabaseConnectionStore connectionStore,
        ITableDataQueryService queryService,
        IPermissionService permissionService,
        ILogger<TableDataController> logger)
    {
        _connectionStore = connectionStore;
        _queryService = queryService;
        _permissionService = permissionService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<IDictionary<string, object?>>>> GetRows(
        string connectionId,
        string database,
        string schema,
        string table,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? search = null,
        [FromQuery] string? sortColumn = null,
        [FromQuery] string? sortDirection = "asc",
        [FromQuery] string? filters = null,
        CancellationToken cancellationToken = default)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        var tableScope = new ResourceScope(connectionId, database, schema, table);
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.DatabaseRead, tableScope, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to view data in this table." });
        }

        var connection = await GetConnectionOrThrowAsync(connectionId, cancellationToken);

        List<FilterConditionDto> filterList = new();
        if (!string.IsNullOrWhiteSpace(filters))
        {
            try
            {
                filterList = JsonSerializer.Deserialize<List<FilterConditionDto>>(
                    filters,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to parse filter JSON string: {Filters}", filters);
            }
        }

        var queryRequest = new TableDataQueryRequest
        {
            Page = page,
            PageSize = pageSize,
            Search = search,
            SortColumn = sortColumn,
            SortDirection = sortDirection,
            Filters = filterList
        };

        var result = await _queryService.GetRowsAsync(
            connection,
            database,
            schema,
            table,
            queryRequest,
            cancellationToken);

        return Ok(result);
    }

    [HttpPost("query")]
    public async Task<ActionResult<PagedResult<IDictionary<string, object?>>>> QueryRows(
        string connectionId,
        string database,
        string schema,
        string table,
        [FromBody] TableDataQueryRequest request,
        CancellationToken cancellationToken = default)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        var tableScope = new ResourceScope(connectionId, database, schema, table);
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.DatabaseRead, tableScope, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to view data in this table." });
        }

        var connection = await GetConnectionOrThrowAsync(connectionId, cancellationToken);

        var result = await _queryService.GetRowsAsync(
            connection,
            database,
            schema,
            table,
            request,
            cancellationToken);

        return Ok(result);
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
