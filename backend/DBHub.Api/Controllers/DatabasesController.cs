using DBHub.Api.DTOs;
using DBHub.Api.Models;
using DBHub.Api.Repositories;
using DBHub.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace DBHub.Api.Controllers;

[ApiController]
[Route("api/connections/{connectionId}/databases")]
public class DatabasesController : ControllerBase
{
    private readonly IDatabaseConnectionStore _connectionStore;
    private readonly ISqlServerMetadataService _metadataService;

    public DatabasesController(
        IDatabaseConnectionStore connectionStore,
        ISqlServerMetadataService metadataService)
    {
        _connectionStore = connectionStore;
        _metadataService = metadataService;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<DatabaseItem>>> GetDatabases(
        string connectionId,
        CancellationToken cancellationToken)
    {
        var connection = await _connectionStore.GetByIdAsync(connectionId, cancellationToken);
        if (connection == null)
        {
            return NotFound(new ErrorResponse { Code = "NOT_FOUND", Message = $"Connection '{connectionId}' was not found." });
        }

        var databases = await _metadataService.GetDatabasesAsync(connection, cancellationToken);
        return Ok(databases);
    }
}
