namespace DBHub.Api.DTOs;

public class CreateSyncPlanRequest
{
    public string CompareSessionId { get; set; } = string.Empty;
    public string Direction { get; set; } = "SourceToTarget"; // "SourceToTarget" or "TargetToSource"
    public SyncPlanOptionsDto Options { get; set; } = new();
}

public class SyncPlanOptionsDto
{
    public bool InsertMissing { get; set; } = true;
    public bool UpdateDifferent { get; set; } = true;
    public bool DeleteExtra { get; set; } = false; // Always OFF by default
    public int BatchSize { get; set; } = 100;
    public bool ContinueNextBatch { get; set; } = true;
    public bool SkipConflicts { get; set; } = true;
}

public class SyncPlanResponse
{
    public string Id { get; set; } = string.Empty;
    public string CompareSessionId { get; set; } = string.Empty;
    public string CreatedByUserId { get; set; } = string.Empty;
    public string CreatedByUsername { get; set; } = string.Empty;

    public string SourceConnectionId { get; set; } = string.Empty;
    public string SourceDatabase { get; set; } = string.Empty;
    public string TargetConnectionId { get; set; } = string.Empty;
    public string TargetDatabase { get; set; } = string.Empty;

    public string Direction { get; set; } = "SourceToTarget";
    public string Status { get; set; } = "Draft";
    public string Environment { get; set; } = "Development";

    public DateTime CreatedAt { get; set; }
    public DateTime? ValidatedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime? ExecutedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    public int TotalOperations { get; set; }
    public int InsertCount { get; set; }
    public int UpdateCount { get; set; }
    public int DeleteCount { get; set; }
    public int SkippedCount { get; set; }
    public int BlockedCount { get; set; }

    public SyncPlanOptionsDto Options { get; set; } = new();
    public ValidationSummaryResponse? Validation { get; set; }

    public bool ApprovalRequired { get; set; }
    public string? ApprovedByUserId { get; set; }
    public string? ApprovedByUsername { get; set; }
    public string? RejectionReason { get; set; }

    public int Version { get; set; } = 1;

    public DateTime? DryRunCompletedAt { get; set; }
    public int? DryRunPlanVersion { get; set; }
    public DryRunResultResponse? DryRunResult { get; set; }
}

public class SyncOperationDto
{
    public string Id { get; set; } = string.Empty;
    public string SyncPlanId { get; set; } = string.Empty;
    public int Order { get; set; }
    public string SchemaName { get; set; } = "dbo";
    public string TableName { get; set; } = string.Empty;
    public string PrimaryKey { get; set; } = string.Empty;
    public Dictionary<string, object?> KeyValues { get; set; } = new();
    public string OperationType { get; set; } = "Insert";
    public string Status { get; set; } = "Pending";
    public bool IsSelected { get; set; } = true;

    public Dictionary<string, object?>? SourceValues { get; set; }
    public Dictionary<string, object?>? TargetValues { get; set; }
    public List<string> ChangedColumns { get; set; } = new();

    public string? ExpectedTargetVersion { get; set; }
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime? ExecutedAt { get; set; }
    public long? DurationMs { get; set; }
}

public class UpdateSelectionRequest
{
    public List<string>? OperationIds { get; set; }
    public string? OperationType { get; set; } // "Insert", "Update", "Delete"
    public string? TableName { get; set; }
    public bool? SelectAll { get; set; }
    public bool? DeselectAll { get; set; }
    public bool Selected { get; set; } = true;
}

public class ValidationSummaryResponse
{
    public bool IsValid { get; set; }
    public bool CanExecute { get; set; }
    public List<string> Errors { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
    public int ValidCount { get; set; }
    public int BlockedCount { get; set; }
    public int ConflictCount { get; set; }
}

public class DryRunResultResponse
{
    public bool Success { get; set; }
    public int WouldInsert { get; set; }
    public int WouldUpdate { get; set; }
    public int WouldDelete { get; set; }
    public int Conflicts { get; set; }
    public int Errors { get; set; }
    public string Message { get; set; } = string.Empty;
    public List<string> LogMessages { get; set; } = new();
}

public class ApprovePlanRequest
{
    public string? Comment { get; set; }
}

public class RejectPlanRequest
{
    public string Reason { get; set; } = string.Empty;
}

public class SyncExecutionProgressResponse
{
    public string Id { get; set; } = string.Empty;
    public string SyncPlanId { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending";
    public string StartedByUsername { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    public string? CurrentTable { get; set; }
    public string? CurrentOperation { get; set; }

    public int TotalOperations { get; set; }
    public int CompletedOperations { get; set; }
    public int FailedOperations { get; set; }
    public int SkippedOperations { get; set; }
    public int ConflictOperations { get; set; }
    public int ProgressPercent { get; set; }

    public string? ErrorMessage { get; set; }
    public Dictionary<string, object?>? ResultSummary { get; set; }
}

public class ReversalPlanResponse
{
    public string NewPlanId { get; set; } = string.Empty;
    public string OriginalPlanId { get; set; } = string.Empty;
    public string ExecutionId { get; set; } = string.Empty;
    public int OperationsCount { get; set; }
    public string Message { get; set; } = string.Empty;
}
