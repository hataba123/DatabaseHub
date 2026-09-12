using DBHub.Api.DTOs;
using DBHub.Api.Models;

namespace DBHub.Api.Services;

public interface ITableDataQueryService
{
    Task<PagedResult<IDictionary<string, object?>>> GetRowsAsync(
        DatabaseConnection connection,
        string database,
        string schema,
        string table,
        TableDataQueryRequest request,
        CancellationToken cancellationToken = default);
}
