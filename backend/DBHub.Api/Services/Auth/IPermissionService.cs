using DBHub.Api.Models;
using DBHub.Api.Security;

namespace DBHub.Api.Services.Auth;

public class EffectivePermissionItem
{
    public string Permission { get; set; } = string.Empty;
    public string ScopeType { get; set; } = string.Empty;
    public string? ConnectionId { get; set; }
    public string? DatabaseName { get; set; }
    public string? SchemaName { get; set; }
    public string? TableName { get; set; }
    public List<string> SourceRoles { get; set; } = new();
}

public interface IPermissionService
{
    Task<bool> HasPermissionAsync(
        string userId,
        string permission,
        ResourceScope? resource = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<EffectivePermissionItem>> GetEffectivePermissionsAsync(
        string userId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DatabaseItem>> FilterDatabasesAsync(
        string userId,
        string connectionId,
        IEnumerable<DatabaseItem> databases,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<TableItem>> FilterTablesAsync(
        string userId,
        string connectionId,
        string database,
        IEnumerable<TableItem> tables,
        CancellationToken cancellationToken = default);

    void InvalidateUserPermissionsCache(string userId);
    void InvalidateAllPermissionsCache();
}
