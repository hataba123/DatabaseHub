using DBHub.Api.Data;
using DBHub.Api.Models;
using DBHub.Api.Models.Auth;
using DBHub.Api.Security;
using DBHub.Api.Services.Auth;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace DBHub.Tests;

public class PermissionServiceTests : IDisposable
{
    private readonly SqliteConnection _sqliteConnection;
    private readonly DBHubDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly PermissionService _permissionService;

    public PermissionServiceTests()
    {
        _sqliteConnection = new SqliteConnection("DataSource=:memory:");
        _sqliteConnection.Open();

        var options = new DbContextOptionsBuilder<DBHubDbContext>()
            .UseSqlite(_sqliteConnection)
            .Options;

        _context = new DBHubDbContext(options);
        _context.Database.EnsureCreated();

        _cache = new MemoryCache(new MemoryCacheOptions());
        _permissionService = new PermissionService(_context, _cache, NullLogger<PermissionService>.Instance);
    }

    public void Dispose()
    {
        _cache.Dispose();
        _context.Dispose();
        _sqliteConnection.Dispose();
    }

    [Fact]
    public async Task HasPermissionAsync_SuperAdmin_HasWildcardAccessToAll()
    {
        // Setup Super Admin role with "*"
        var role = new Role { Id = "r-admin", Name = "Super Admin" };
        var user = new User { Id = "u-admin", Username = "admin", IsActive = true };
        var perm = new RolePermission
        {
            RoleId = role.Id,
            Permission = PermissionDefinitions.All,
            ScopeType = PermissionScopeType.Global
        };

        _context.Roles.Add(role);
        _context.Users.Add(user);
        _context.RolePermissions.Add(perm);
        _context.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
        await _context.SaveChangesAsync();

        // Check any arbitrary permission & scope
        var hasUserManage = await _permissionService.HasPermissionAsync(user.Id, PermissionDefinitions.UserManage);
        var hasDbRead = await _permissionService.HasPermissionAsync(
            user.Id,
            PermissionDefinitions.DatabaseRead,
            new ResourceScope("conn-prod", "ERP_Db", "dbo", "Payroll"));

        Assert.True(hasUserManage);
        Assert.True(hasDbRead);
    }

    [Fact]
    public async Task HasPermissionAsync_TableLevelScope_EnforcesStrictBoundary()
    {
        // User with permission ONLY on conn-1 / ERP / dbo / Employees
        var role = new Role { Id = "r-emp-viewer", Name = "Employee Viewer" };
        var user = new User { Id = "u-emp", Username = "empviewer", IsActive = true };
        var perm = new RolePermission
        {
            RoleId = role.Id,
            Permission = PermissionDefinitions.DatabaseRead,
            ScopeType = PermissionScopeType.Table,
            ConnectionId = "conn-1",
            DatabaseName = "ERP",
            SchemaName = "dbo",
            TableName = "Employees"
        };

        _context.Roles.Add(role);
        _context.Users.Add(user);
        _context.RolePermissions.Add(perm);
        _context.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
        await _context.SaveChangesAsync();

        // Allowed: exactly conn-1 / ERP / dbo / Employees
        var canReadEmployees = await _permissionService.HasPermissionAsync(
            user.Id,
            PermissionDefinitions.DatabaseRead,
            new ResourceScope("conn-1", "ERP", "dbo", "Employees"));
        Assert.True(canReadEmployees);

        // Denied: different table in same database (conn-1 / ERP / dbo / Salaries)
        var canReadSalaries = await _permissionService.HasPermissionAsync(
            user.Id,
            PermissionDefinitions.DatabaseRead,
            new ResourceScope("conn-1", "ERP", "dbo", "Salaries"));
        Assert.False(canReadSalaries);

        // Denied: different database (conn-1 / HR / dbo / Employees)
        var canReadHR = await _permissionService.HasPermissionAsync(
            user.Id,
            PermissionDefinitions.DatabaseRead,
            new ResourceScope("conn-1", "HR", "dbo", "Employees"));
        Assert.False(canReadHR);

        // Denied: different connection (conn-2 / ERP / dbo / Employees)
        var canReadConn2 = await _permissionService.HasPermissionAsync(
            user.Id,
            PermissionDefinitions.DatabaseRead,
            new ResourceScope("conn-2", "ERP", "dbo", "Employees"));
        Assert.False(canReadConn2);
    }

    [Fact]
    public async Task HasPermissionAsync_DatabaseLevelScope_InheritsToAllTablesUnderIt()
    {
        var role = new Role { Id = "r-db-reader", Name = "DB Reader" };
        var user = new User { Id = "u-db-reader", Username = "dbreader", IsActive = true };
        var perm = new RolePermission
        {
            RoleId = role.Id,
            Permission = PermissionDefinitions.DatabaseRead,
            ScopeType = PermissionScopeType.Database,
            ConnectionId = "conn-1",
            DatabaseName = "SalesDb"
        };

        _context.Roles.Add(role);
        _context.Users.Add(user);
        _context.RolePermissions.Add(perm);
        _context.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
        await _context.SaveChangesAsync();

        // Allowed on Orders table under SalesDb
        var canReadOrders = await _permissionService.HasPermissionAsync(
            user.Id,
            PermissionDefinitions.DatabaseRead,
            new ResourceScope("conn-1", "SalesDb", "dbo", "Orders"));
        Assert.True(canReadOrders);

        // Allowed on Customers table under SalesDb
        var canReadCustomers = await _permissionService.HasPermissionAsync(
            user.Id,
            PermissionDefinitions.DatabaseRead,
            new ResourceScope("conn-1", "SalesDb", "sales", "Customers"));
        Assert.True(canReadCustomers);

        // Denied on another database in same connection
        var canReadInventory = await _permissionService.HasPermissionAsync(
            user.Id,
            PermissionDefinitions.DatabaseRead,
            new ResourceScope("conn-1", "InventoryDb", "dbo", "Items"));
        Assert.False(canReadInventory);
    }

    [Fact]
    public async Task FilterTablesAsync_ReturnsOnlyAccessibleTables()
    {
        var role = new Role { Id = "r-table-limiter", Name = "Limited Viewer" };
        var user = new User { Id = "u-limited", Username = "limited", IsActive = true };
        var perm = new RolePermission
        {
            RoleId = role.Id,
            Permission = PermissionDefinitions.DatabaseRead,
            ScopeType = PermissionScopeType.Table,
            ConnectionId = "conn-alpha",
            DatabaseName = "AppDb",
            SchemaName = "dbo",
            TableName = "PublicCatalog"
        };

        _context.Roles.Add(role);
        _context.Users.Add(user);
        _context.RolePermissions.Add(perm);
        _context.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
        await _context.SaveChangesAsync();

        var allTables = new List<TableItem>
        {
            new() { Schema = "dbo", Name = "PublicCatalog", RowCount = 100 },
            new() { Schema = "dbo", Name = "SecretTokens", RowCount = 5 },
            new() { Schema = "dbo", Name = "FinancialRecords", RowCount = 500 }
        };

        var filtered = await _permissionService.FilterTablesAsync(
            user.Id,
            "conn-alpha",
            "AppDb",
            allTables);

        Assert.Single(filtered);
        Assert.Equal("PublicCatalog", filtered[0].Name);
    }

    [Fact]
    public async Task CacheInvalidation_RefreshesPermissionsImmediately()
    {
        var role = new Role { Id = "r-dynamic", Name = "Dynamic Role" };
        var user = new User { Id = "u-dynamic", Username = "dynamicuser", IsActive = true };
        _context.Roles.Add(role);
        _context.Users.Add(user);
        _context.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id });
        await _context.SaveChangesAsync();

        // Initially no permissions
        var hasPermBefore = await _permissionService.HasPermissionAsync(user.Id, PermissionDefinitions.ConnectionView);
        Assert.False(hasPermBefore);

        // Add permission
        _context.RolePermissions.Add(new RolePermission
        {
            RoleId = role.Id,
            Permission = PermissionDefinitions.ConnectionView,
            ScopeType = PermissionScopeType.Global
        });
        await _context.SaveChangesAsync();

        // Invalidate cache
        _permissionService.InvalidateUserPermissionsCache(user.Id);

        // Now has permission
        var hasPermAfter = await _permissionService.HasPermissionAsync(user.Id, PermissionDefinitions.ConnectionView);
        Assert.True(hasPermAfter);
    }
}
