using DBHub.Api.Models;

namespace DBHub.Api.Services;

public interface ISqlServerMetadataService
{
    Task<IReadOnlyList<DatabaseItem>> GetDatabasesAsync(
        DatabaseConnection connection,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<TableItem>> GetTablesAsync(
        DatabaseConnection connection,
        string database,
        string? search = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ViewItem>> GetViewsAsync(
        DatabaseConnection connection,
        string database,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ProcedureItem>> GetStoredProceduresAsync(
        DatabaseConnection connection,
        string database,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ColumnItem>> GetColumnsAsync(
        DatabaseConnection connection,
        string database,
        string schema,
        string table,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<IndexItem>> GetIndexesAsync(
        DatabaseConnection connection,
        string database,
        string schema,
        string table,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<RelationshipItem>> GetRelationshipsAsync(
        DatabaseConnection connection,
        string database,
        string schema,
        string table,
        CancellationToken cancellationToken = default);
}
