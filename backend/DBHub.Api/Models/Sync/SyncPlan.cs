namespace DBHub.Api.Models.Sync;

public static class SyncPlanStatus
{
    public const string Draft = "Draft";
    public const string Validating = "Validating";
    public const string Ready = "Ready";
    public const string AwaitingApproval = "AwaitingApproval";
    public const string Approved = "Approved";
    public const string Executing = "Executing";
    public const string Completed = "Completed";
    public const string CompletedWithErrors = "CompletedWithErrors";
    public const string Failed = "Failed";
    public const string Cancelled = "Cancelled";
    public const string Expired = "Expired";
    public const string Rejected = "Rejected";
}

public static class SyncDirection
{
    public const string SourceToTarget = "SourceToTarget";
    public const string TargetToSource = "TargetToSource";
}

public class SyncPlan
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string CompareSessionId { get; set; } = string.Empty;
    public string CreatedByUserId { get; set; } = string.Empty;
    public string CreatedByUsername { get; set; } = string.Empty;

    public string SourceConnectionId { get; set; } = string.Empty;
    public string SourceDatabase { get; set; } = string.Empty;
    public string TargetConnectionId { get; set; } = string.Empty;
    public string TargetDatabase { get; set; } = string.Empty;

    public string Direction { get; set; } = SyncDirection.SourceToTarget;
    public string Status { get; set; } = SyncPlanStatus.Draft;
    public string Environment { get; set; } = "Development";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ValidatedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime? ExecutedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime? CancelledAt { get; set; }

    public int TotalOperations { get; set; }
    public int InsertCount { get; set; }
    public int UpdateCount { get; set; }
    public int DeleteCount { get; set; }
    public int SkippedCount { get; set; }
    public int BlockedCount { get; set; }

    public string? OptionsJson { get; set; }
    public string? ValidationResultJson { get; set; }

    public bool ApprovalRequired { get; set; }
    public string? ApprovedByUserId { get; set; }
    public string? ApprovedByUsername { get; set; }
    public string? RejectionReason { get; set; }

    public int Version { get; set; } = 1;

    public DateTime? DryRunCompletedAt { get; set; }
    public int? DryRunPlanVersion { get; set; }
    public string? DryRunResultJson { get; set; }

    public List<SyncOperation> Operations { get; set; } = new();
}
