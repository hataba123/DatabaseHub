namespace DBHub.Api.DTOs;

public class CreateCompareSessionRequest
{
    public string SourceConnectionId { get; set; } = string.Empty;
    public string SourceDatabase { get; set; } = string.Empty;
    public string TargetConnectionId { get; set; } = string.Empty;
    public string TargetDatabase { get; set; } = string.Empty;
    public List<string>? Tables { get; set; }
}

public class CompareSessionDto
{
    public string Id { get; set; } = string.Empty;
    public string SourceConnectionId { get; set; } = string.Empty;
    public string SourceDatabase { get; set; } = string.Empty;
    public string TargetConnectionId { get; set; } = string.Empty;
    public string TargetDatabase { get; set; } = string.Empty;
    public string Status { get; set; } = "Completed";
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int TotalTablesCompared { get; set; }
    public int TablesWithDifferences { get; set; }
    public int TotalDifferencesCount { get; set; }
    public List<TableCompareResultDto> TableResults { get; set; } = new();
}

public class TableCompareResultDto
{
    public string TableName { get; set; } = string.Empty;
    public string SchemaName { get; set; } = "dbo";
    public int SourceRowCount { get; set; }
    public int TargetRowCount { get; set; }
    public int DifferencesCount { get; set; }
    public string Status { get; set; } = "Same"; // Same, Different, Missing in Target, Missing in Source
    public List<RowCompareResultDto> RowDifferences { get; set; } = new();
}

public class RowCompareResultDto
{
    public string PrimaryKey { get; set; } = string.Empty;
    public Dictionary<string, object?> KeyValues { get; set; } = new();
    public string SourceStatus { get; set; } = "Exists"; // Exists, Missing
    public string TargetStatus { get; set; } = "Exists"; // Exists, Missing
    public string Status { get; set; } = "Same"; // Same, Different, Missing in Target, Missing in Source
    public Dictionary<string, object?>? SourceData { get; set; }
    public Dictionary<string, object?>? TargetData { get; set; }
    public List<string> ChangedColumns { get; set; } = new();
}
