namespace DBHub.Api.Models.Sync;

public static class SyncOperationType
{
    public const string Insert = "Insert";
    public const string Update = "Update";
    public const string Delete = "Delete";
    public const string Skip = "Skip";
    public const string Blocked = "Blocked";
}

public static class SyncOperationStatus
{
    public const string Pending = "Pending";
    public const string Validated = "Validated";
    public const string Executing = "Executing";
    public const string Completed = "Completed";
    public const string Skipped = "Skipped";
    public const string Conflict = "Conflict";
    public const string Failed = "Failed";
    public const string RolledBack = "RolledBack";
    public const string Blocked = "Blocked";
    public const string Cancelled = "Cancelled";
}

public class SyncOperation
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string SyncPlanId { get; set; } = string.Empty;
    public int Order { get; set; }

    public string SchemaName { get; set; } = "dbo";
    public string TableName { get; set; } = string.Empty;
    public string PrimaryKeyJson { get; set; } = "{}";

    public string OperationType { get; set; } = SyncOperationType.Insert;
    public string Status { get; set; } = SyncOperationStatus.Pending;
    public bool IsSelected { get; set; } = true;

    public string? SourceValuesJson { get; set; }
    public string? TargetValuesJson { get; set; }
    public string? ChangedColumnsJson { get; set; }

    public string? ExpectedTargetVersion { get; set; }
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }

    public DateTime? ExecutedAt { get; set; }
    public long? DurationMs { get; set; }

    public SyncPlan? SyncPlan { get; set; }
}
