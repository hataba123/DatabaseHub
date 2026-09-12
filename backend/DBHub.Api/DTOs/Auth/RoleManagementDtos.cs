using DBHub.Api.Models.Auth;

namespace DBHub.Api.DTOs.Auth;

public class CreateRoleRequest
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class UpdateRoleRequest
{
    public string Description { get; set; } = string.Empty;
}

public class RoleResponse
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsSystemRole { get; set; }
    public int UserCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class RolePermissionItemDto
{
    public string Permission { get; set; } = string.Empty;
    public string ScopeType { get; set; } = "Global";
    public string? ConnectionId { get; set; }
    public string? Database { get; set; }
    public string? Schema { get; set; }
    public string? Table { get; set; }
}

public class UpdateRolePermissionsRequest
{
    public List<RolePermissionItemDto> Permissions { get; set; } = new();
}
