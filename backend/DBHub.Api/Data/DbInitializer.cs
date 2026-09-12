using DBHub.Api.Models.Auth;
using DBHub.Api.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace DBHub.Api.Data;

public static class DbInitializer
{
    public static async Task InitializeAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<DBHubDbContext>();
        var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();
        var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<DBHubDbContext>>();

        await context.Database.EnsureCreatedAsync();

        // 1. Seed Roles
        var superAdminRole = await context.Roles.FirstOrDefaultAsync(r => r.Name == "Super Admin");
        if (superAdminRole == null)
        {
            superAdminRole = new Role
            {
                Id = "role-super-admin",
                Name = "Super Admin",
                Description = "Full access to all system and database resources",
                IsSystemRole = true,
                CreatedAt = DateTime.UtcNow
            };
            context.Roles.Add(superAdminRole);
            context.RolePermissions.Add(new RolePermission
            {
                RoleId = superAdminRole.Id,
                Permission = PermissionDefinitions.All,
                ScopeType = PermissionScopeType.Global
            });
        }

        var dbAdminRole = await context.Roles.FirstOrDefaultAsync(r => r.Name == "Database Admin");
        if (dbAdminRole == null)
        {
            dbAdminRole = new Role
            {
                Id = "role-db-admin",
                Name = "Database Admin",
                Description = "Manages database connections, reads and edits tables, views metrics and audits",
                IsSystemRole = true,
                CreatedAt = DateTime.UtcNow
            };
            context.Roles.Add(dbAdminRole);
            var dbAdminPerms = new[]
            {
                PermissionDefinitions.ConnectionView,
                PermissionDefinitions.ConnectionManage,
                PermissionDefinitions.DatabaseRead,
                PermissionDefinitions.DatabaseInsert,
                PermissionDefinitions.DatabaseUpdate,
                PermissionDefinitions.DatabaseDelete,
                PermissionDefinitions.DatabaseExport,
                PermissionDefinitions.DatabaseImport,
                PermissionDefinitions.AuditView,
                PermissionDefinitions.MonitoringView,
                PermissionDefinitions.SyncView,
                PermissionDefinitions.SyncCreatePlan,
                PermissionDefinitions.SyncExecute,
                PermissionDefinitions.SyncDelete,
                PermissionDefinitions.SyncApprove,
                PermissionDefinitions.SyncViewHistory,
                PermissionDefinitions.SyncCancel,
                PermissionDefinitions.SyncExecuteProduction
            };
            foreach (var p in dbAdminPerms)
            {
                context.RolePermissions.Add(new RolePermission
                {
                    RoleId = dbAdminRole.Id,
                    Permission = p,
                    ScopeType = PermissionScopeType.Global
                });
            }
        }

        var dataEditorRole = await context.Roles.FirstOrDefaultAsync(r => r.Name == "Data Editor");
        if (dataEditorRole == null)
        {
            dataEditorRole = new Role
            {
                Id = "role-data-editor",
                Name = "Data Editor",
                Description = "Can read, insert, update and export table records",
                IsSystemRole = true,
                CreatedAt = DateTime.UtcNow
            };
            context.Roles.Add(dataEditorRole);
            var editorPerms = new[]
            {
                PermissionDefinitions.DatabaseRead,
                PermissionDefinitions.DatabaseInsert,
                PermissionDefinitions.DatabaseUpdate,
                PermissionDefinitions.DatabaseExport
            };
            foreach (var p in editorPerms)
            {
                context.RolePermissions.Add(new RolePermission
                {
                    RoleId = dataEditorRole.Id,
                    Permission = p,
                    ScopeType = PermissionScopeType.Global
                });
            }
        }

        var dataViewerRole = await context.Roles.FirstOrDefaultAsync(r => r.Name == "Data Viewer");
        if (dataViewerRole == null)
        {
            dataViewerRole = new Role
            {
                Id = "role-data-viewer",
                Name = "Data Viewer",
                Description = "Read-only access to browse and export table records",
                IsSystemRole = true,
                CreatedAt = DateTime.UtcNow
            };
            context.Roles.Add(dataViewerRole);
            var viewerPerms = new[]
            {
                PermissionDefinitions.DatabaseRead,
                PermissionDefinitions.DatabaseExport
            };
            foreach (var p in viewerPerms)
            {
                context.RolePermissions.Add(new RolePermission
                {
                    RoleId = dataViewerRole.Id,
                    Permission = p,
                    ScopeType = PermissionScopeType.Global
                });
            }
        }

        var auditorRole = await context.Roles.FirstOrDefaultAsync(r => r.Name == "Auditor");
        if (auditorRole == null)
        {
            auditorRole = new Role
            {
                Id = "role-auditor",
                Name = "Auditor",
                Description = "Inspects change logs, audit events, and data compliance",
                IsSystemRole = true,
                CreatedAt = DateTime.UtcNow
            };
            context.Roles.Add(auditorRole);
            var auditorPerms = new[]
            {
                PermissionDefinitions.DatabaseRead,
                PermissionDefinitions.AuditView
            };
            foreach (var p in auditorPerms)
            {
                context.RolePermissions.Add(new RolePermission
                {
                    RoleId = auditorRole.Id,
                    Permission = p,
                    ScopeType = PermissionScopeType.Global
                });
            }
        }

        await context.SaveChangesAsync();

        // 2. Seed Super Admin User
        var adminUsername = configuration["DBHUB_ADMIN_USERNAME"] ?? "admin";
        var adminPassword = configuration["DBHUB_ADMIN_PASSWORD"] ?? "Admin@123456";

        var adminUser = await context.Users.FirstOrDefaultAsync(u => u.Username == adminUsername);
        if (adminUser == null)
        {
            adminUser = new User
            {
                Id = "usr-super-admin",
                Username = adminUsername,
                Email = "admin@dbhub.enterprise",
                DisplayName = "System Administrator",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = "System"
            };
            adminUser.PasswordHash = passwordHasher.HashPassword(adminUser, adminPassword);
            context.Users.Add(adminUser);
            await context.SaveChangesAsync();

            context.UserRoles.Add(new UserRole
            {
                UserId = adminUser.Id,
                RoleId = superAdminRole.Id
            });
            await context.SaveChangesAsync();

            logger.LogInformation("Seeded Super Admin user '{Username}'", adminUsername);
        }

        // 3. Seed Sample User 'loi' (Database Admin + Auditor)
        var loiUser = await context.Users.FirstOrDefaultAsync(u => u.Username == "loi");
        if (loiUser == null)
        {
            loiUser = new User
            {
                Id = "usr-loi",
                Username = "loi",
                Email = "loi.le@dbhub.enterprise",
                DisplayName = "Lê Thành Lợi",
                IsActive = true,
                CreatedAt = DateTime.UtcNow.AddMonths(-3),
                CreatedBy = "System"
            };
            loiUser.PasswordHash = passwordHasher.HashPassword(loiUser, "Password123!");
            context.Users.Add(loiUser);
            await context.SaveChangesAsync();

            context.UserRoles.Add(new UserRole { UserId = loiUser.Id, RoleId = dbAdminRole.Id });
            context.UserRoles.Add(new UserRole { UserId = loiUser.Id, RoleId = auditorRole.Id });
            await context.SaveChangesAsync();
        }

        // 4. Seed Sample User 'editor'
        var editorUser = await context.Users.FirstOrDefaultAsync(u => u.Username == "editor");
        if (editorUser == null)
        {
            editorUser = new User
            {
                Id = "usr-editor",
                Username = "editor",
                Email = "editor@dbhub.enterprise",
                DisplayName = "Data Editor Demo",
                IsActive = true,
                CreatedAt = DateTime.UtcNow.AddMonths(-1),
                CreatedBy = "System"
            };
            editorUser.PasswordHash = passwordHasher.HashPassword(editorUser, "Password123!");
            context.Users.Add(editorUser);
            await context.SaveChangesAsync();

            context.UserRoles.Add(new UserRole { UserId = editorUser.Id, RoleId = dataEditorRole.Id });
            await context.SaveChangesAsync();
        }

        // 5. Seed Sample User 'viewer'
        var viewerUser = await context.Users.FirstOrDefaultAsync(u => u.Username == "viewer");
        if (viewerUser == null)
        {
            viewerUser = new User
            {
                Id = "usr-viewer",
                Username = "viewer",
                Email = "viewer@dbhub.enterprise",
                DisplayName = "Data Viewer Demo",
                IsActive = true,
                CreatedAt = DateTime.UtcNow.AddMonths(-1),
                CreatedBy = "System"
            };
            viewerUser.PasswordHash = passwordHasher.HashPassword(viewerUser, "Password123!");
            context.Users.Add(viewerUser);
            await context.SaveChangesAsync();

            context.UserRoles.Add(new UserRole { UserId = viewerUser.Id, RoleId = dataViewerRole.Id });
            await context.SaveChangesAsync();
        }
    }
}
