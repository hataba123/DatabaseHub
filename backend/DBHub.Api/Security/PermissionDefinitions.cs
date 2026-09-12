namespace DBHub.Api.Security;

public static class PermissionDefinitions
{
    public const string All = "*";

    public const string DatabaseRead = "Database.Read";
    public const string DatabaseInsert = "Database.Insert";
    public const string DatabaseUpdate = "Database.Update";
    public const string DatabaseDelete = "Database.Delete";
    public const string DatabaseExport = "Database.Export";
    public const string DatabaseImport = "Database.Import";
    public const string DatabaseExecuteProcedure = "Database.ExecuteProcedure";

    public const string ConnectionView = "Connection.View";
    public const string ConnectionManage = "Connection.Manage";

    public const string UserView = "User.View";
    public const string UserManage = "User.Manage";

    public const string RoleView = "Role.View";
    public const string RoleManage = "Role.Manage";

    public const string AuditView = "Audit.View";
    public const string MonitoringView = "Monitoring.View";
    public const string SystemManage = "System.Manage";

    public static readonly IReadOnlyList<string> AllPermissions = new[]
    {
        DatabaseRead,
        DatabaseInsert,
        DatabaseUpdate,
        DatabaseDelete,
        DatabaseExport,
        DatabaseImport,
        DatabaseExecuteProcedure,
        ConnectionView,
        ConnectionManage,
        UserView,
        UserManage,
        RoleView,
        RoleManage,
        AuditView,
        MonitoringView,
        SystemManage
    };

    public static bool IsValidPermission(string permission)
    {
        return permission == All || AllPermissions.Contains(permission);
    }
}
