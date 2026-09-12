namespace DBHub.Api.DTOs;

public class CreateRowRequest
{
    public Dictionary<string, object?> Values { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}

public class UpdateRowRequest
{
    public Dictionary<string, object?> Keys { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public Dictionary<string, object?> Values { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public string? RowVersion { get; set; }
}

public class DeleteRowRequest
{
    public Dictionary<string, object?> Keys { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public string? RowVersion { get; set; }
}

public class DeleteRowItem
{
    public Dictionary<string, object?> Keys { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    public string? RowVersion { get; set; }
}

public class BulkDeleteRequest
{
    public List<DeleteRowItem> Rows { get; set; } = new();
}

public class RowOperationResult
{
    public bool Success { get; set; } = true;
    public int AffectedRows { get; set; }
    public Dictionary<string, object?>? Data { get; set; }
    public string? Message { get; set; }
}

public class BulkOperationResult
{
    public int TotalRequested { get; set; }
    public int DeletedCount { get; set; }
    public bool Success { get; set; } = true;
    public string? Message { get; set; }
}

public class TableCapabilitiesResponse
{
    public bool CanInsert { get; set; }
    public bool CanUpdate { get; set; }
    public bool CanDelete { get; set; }
    public bool IsWritable { get; set; }
    public List<string> PrimaryKeys { get; set; } = new();
    public bool HasRowVersion { get; set; }
    public string? RowVersionColumn { get; set; }
    public string? Reason { get; set; }
}

public class LookupItemDto
{
    public object? Value { get; set; }
    public string Label { get; set; } = string.Empty;
}

public class RowAuditHistoryItem
{
    public long Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public bool Success { get; set; }
    public object? Diff { get; set; }
}
