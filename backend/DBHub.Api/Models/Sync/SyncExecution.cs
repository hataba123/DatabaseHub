namespace DBHub.Api.Models.Sync;

public static class SyncExecutionStatus
{
    public const string Pending = "Pending";
    public const string Executing = "Executing";
    public const string Completed = "Completed";
    public const string CompletedWithErrors = "CompletedWithErrors";
    public const string Failed = "Failed";
    public const string Cancelled = "Cancelled";
}

public class SyncExecution
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string SyncPlanId { get; set; } = string.Empty;

    public string StartedByUserId { get; set; } = string.Empty;
    public string StartedByUsername { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    public string Status { get; set; } = SyncExecutionStatus.Pending;

    public string? CurrentTable { get; set; }
    public string? CurrentOperation { get; set; }

    public int TotalOperations { get; set; }
    public int CompletedOperations { get; set; }
    public int FailedOperations { get; set; }
    public int SkippedOperations { get; set; }
    public int ConflictOperations { get; set; }
    public int ProgressPercent { get; set; }

    public string? ErrorMessage { get; set; }
    public string? ResultSummaryJson { get; set; }

    public SyncPlan? SyncPlan { get; set; }
}
