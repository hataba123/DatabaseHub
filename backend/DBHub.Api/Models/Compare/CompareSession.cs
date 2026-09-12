namespace DBHub.Api.Models.Compare;

public class CompareSession
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string SourceConnectionId { get; set; } = string.Empty;
    public string SourceDatabase { get; set; } = string.Empty;
    public string TargetConnectionId { get; set; } = string.Empty;
    public string TargetDatabase { get; set; } = string.Empty;
    public string Status { get; set; } = "Completed"; // "Running", "Completed", "Failed", "Cancelled"
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public string? CreatedByUserId { get; set; }

    public int TotalTablesCompared { get; set; }
    public int TablesWithDifferences { get; set; }
    public int TotalDifferencesCount { get; set; }

    /// <summary>
    /// Serialized JSON containing table comparison list and row difference summaries.
    /// </summary>
    public string? ResultsJson { get; set; }
}
