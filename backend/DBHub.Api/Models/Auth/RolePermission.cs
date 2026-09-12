namespace DBHub.Api.Models.Auth;

public enum PermissionScopeType
{
    Global = 0,
    Connection = 1,
    Database = 2,
    Schema = 3,
    Table = 4
}

public class RolePermission
{
    public long Id { get; set; }

    public string RoleId { get; set; } = string.Empty;
    public Role Role { get; set; } = null!;

    public string Permission { get; set; } = string.Empty;
    public PermissionScopeType ScopeType { get; set; } = PermissionScopeType.Global;

    public string? ConnectionId { get; set; }
    public string? DatabaseName { get; set; }
    public string? SchemaName { get; set; }
    public string? TableName { get; set; }
}
