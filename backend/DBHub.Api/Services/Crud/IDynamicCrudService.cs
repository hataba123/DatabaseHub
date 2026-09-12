using DBHub.Api.DTOs;
using DBHub.Api.Models;

namespace DBHub.Api.Services.Crud;

public interface IDynamicCrudService
{
    Task<TableCapabilitiesResponse> GetCapabilitiesAsync(
        DatabaseConnection connection,
        string database,
        string schema,
        string table,
        CancellationToken cancellationToken = default);

    Task<IDictionary<string, object?>?> GetRowByKeyAsync(
        DatabaseConnection connection,
        string database,
        string schema,
        string table,
        IDictionary<string, object?> keys,
        CancellationToken cancellationToken = default);

    Task<RowOperationResult> CreateRowAsync(
        DatabaseConnection connection,
        string database,
        string schema,
        string table,
        CreateRowRequest request,
        string? userId,
        string? username,
        string? ipAddress,
        CancellationToken cancellationToken = default);

    Task<RowOperationResult> UpdateRowAsync(
        DatabaseConnection connection,
        string database,
        string schema,
        string table,
        UpdateRowRequest request,
        string? userId,
        string? username,
        string? ipAddress,
        CancellationToken cancellationToken = default);

    Task<RowOperationResult> DeleteRowAsync(
        DatabaseConnection connection,
        string database,
        string schema,
        string table,
        DeleteRowRequest request,
        string? userId,
        string? username,
        string? ipAddress,
        CancellationToken cancellationToken = default);

    Task<BulkOperationResult> BulkDeleteRowsAsync(
        DatabaseConnection connection,
        string database,
        string schema,
        string table,
        BulkDeleteRequest request,
        string? userId,
        string? username,
        string? ipAddress,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<LookupItemDto>> GetLookupValuesAsync(
        DatabaseConnection connection,
        string database,
        string schema,
        string table,
        string column,
        int top = 50,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<RowAuditHistoryItem>> GetRowAuditHistoryAsync(
        string database,
        string schema,
        string table,
        string? targetId = null,
        CancellationToken cancellationToken = default);
}
