using DBHub.Api.Data;
using DBHub.Api.Models;
using DBHub.Api.Models.Auth;
using DBHub.Api.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace DBHub.Api.Services.Auth;

public class PermissionService : IPermissionService
{
    private readonly DBHubDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly ILogger<PermissionService> _logger;
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(3);

    public PermissionService(
        DBHubDbContext context,
        IMemoryCache cache,
        ILogger<PermissionService> logger)
    {
        _context = context;
        _cache = cache;
        _logger = logger;
    }

    public async Task<bool> HasPermissionAsync(
        string userId,
        string permission,
        ResourceScope? resource = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            return false;
        }

        var effectivePermissions = await GetEffectivePermissionsAsync(userId, cancellationToken);

        // 1. Wildcard super admin check
        if (effectivePermissions.Any(p => p.Permission == PermissionDefinitions.All))
        {
            return true;
        }

        // 2. Matching permissions
        var matching = effectivePermissions
            .Where(p => string.Equals(p.Permission, permission, StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (matching.Count == 0)
        {
            return false;
        }

        // If no resource scope is required for check, any grant is sufficient
        if (resource == null)
        {
            return true;
        }

        // Check hierarchical matches
        foreach (var p in matching)
        {
            switch (p.ScopeType)
            {
                case nameof(PermissionScopeType.Global):
                    return true;

                case nameof(PermissionScopeType.Connection):
                    if (string.Equals(p.ConnectionId, resource.ConnectionId, StringComparison.OrdinalIgnoreCase))
                    {
                        return true;
                    }
                    break;

                case nameof(PermissionScopeType.Database):
                    if (string.Equals(p.ConnectionId, resource.ConnectionId, StringComparison.OrdinalIgnoreCase) &&
                        string.Equals(p.DatabaseName, resource.DatabaseName, StringComparison.OrdinalIgnoreCase))
                    {
                        return true;
                    }
                    break;

                case nameof(PermissionScopeType.Schema):
                    if (string.Equals(p.ConnectionId, resource.ConnectionId, StringComparison.OrdinalIgnoreCase) &&
                        string.Equals(p.DatabaseName, resource.DatabaseName, StringComparison.OrdinalIgnoreCase) &&
                        string.Equals(p.SchemaName, resource.SchemaName, StringComparison.OrdinalIgnoreCase))
                    {
                        return true;
                    }
                    break;

                case nameof(PermissionScopeType.Table):
                    if (string.Equals(p.ConnectionId, resource.ConnectionId, StringComparison.OrdinalIgnoreCase) &&
                        string.Equals(p.DatabaseName, resource.DatabaseName, StringComparison.OrdinalIgnoreCase) &&
                        string.Equals(p.SchemaName, resource.SchemaName, StringComparison.OrdinalIgnoreCase) &&
                        string.Equals(p.TableName, resource.TableName, StringComparison.OrdinalIgnoreCase))
                    {
                        return true;
                    }
                    break;
            }
        }

        return false;
    }

    public async Task<IReadOnlyList<EffectivePermissionItem>> GetEffectivePermissionsAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        var cacheKey = $"eff_perms:{userId}";
        if (_cache.TryGetValue<IReadOnlyList<EffectivePermissionItem>>(cacheKey, out var cached) && cached != null)
        {
            return cached;
        }

        var rolesWithPermissions = await _context.UserRoles
            .Where(ur => ur.UserId == userId)
            .Include(ur => ur.Role)
                .ThenInclude(r => r.RolePermissions)
            .Select(ur => ur.Role)
            .ToListAsync(cancellationToken);

        var list = new List<EffectivePermissionItem>();
        var map = new Dictionary<string, EffectivePermissionItem>();

        foreach (var role in rolesWithPermissions)
        {
            foreach (var perm in role.RolePermissions)
            {
                var key = $"{perm.Permission}:{perm.ScopeType}:{perm.ConnectionId ?? "*"}:{perm.DatabaseName ?? "*"}:{perm.SchemaName ?? "*"}:{perm.TableName ?? "*"}";
                if (!map.TryGetValue(key, out var item))
                {
                    item = new EffectivePermissionItem
                    {
                        Permission = perm.Permission,
                        ScopeType = perm.ScopeType.ToString(),
                        ConnectionId = perm.ConnectionId,
                        DatabaseName = perm.DatabaseName,
                        SchemaName = perm.SchemaName,
                        TableName = perm.TableName,
                        SourceRoles = new List<string>()
                    };
                    map[key] = item;
                    list.Add(item);
                }

                if (!item.SourceRoles.Contains(role.Name))
                {
                    item.SourceRoles.Add(role.Name);
                }
            }
        }

        _cache.Set(cacheKey, (IReadOnlyList<EffectivePermissionItem>)list, CacheDuration);
        return list;
    }

    public async Task<IReadOnlyList<DatabaseItem>> FilterDatabasesAsync(
        string userId,
        string connectionId,
        IEnumerable<DatabaseItem> databases,
        CancellationToken cancellationToken = default)
    {
        var effective = await GetEffectivePermissionsAsync(userId, cancellationToken);
        if (effective.Any(p => p.Permission == PermissionDefinitions.All))
        {
            return databases.ToList();
        }

        var filtered = new List<DatabaseItem>();
        foreach (var db in databases)
        {
            var canRead = await HasPermissionAsync(
                userId,
                PermissionDefinitions.DatabaseRead,
                new ResourceScope(connectionId, db.Name),
                cancellationToken);

            if (canRead)
            {
                filtered.Add(db);
            }
        }

        return filtered;
    }

    public async Task<IReadOnlyList<TableItem>> FilterTablesAsync(
        string userId,
        string connectionId,
        string database,
        IEnumerable<TableItem> tables,
        CancellationToken cancellationToken = default)
    {
        var effective = await GetEffectivePermissionsAsync(userId, cancellationToken);
        if (effective.Any(p => p.Permission == PermissionDefinitions.All))
        {
            return tables.ToList();
        }

        var hasDbRead = await HasPermissionAsync(
            userId,
            PermissionDefinitions.DatabaseRead,
            new ResourceScope(connectionId, database),
            cancellationToken);

        if (hasDbRead)
        {
            return tables.ToList();
        }

        var filtered = new List<TableItem>();
        foreach (var tbl in tables)
        {
            var canReadTable = await HasPermissionAsync(
                userId,
                PermissionDefinitions.DatabaseRead,
                new ResourceScope(connectionId, database, tbl.Schema, tbl.Name),
                cancellationToken);

            if (canReadTable)
            {
                filtered.Add(tbl);
            }
        }

        return filtered;
    }

    public void InvalidateUserPermissionsCache(string userId)
    {
        _cache.Remove($"eff_perms:{userId}");
    }

    public void InvalidateAllPermissionsCache()
    {
        // Cache will naturally expire within CacheDuration
    }
}
