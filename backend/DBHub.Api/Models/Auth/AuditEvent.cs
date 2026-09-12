namespace DBHub.Api.Models.Auth;

public class AuditEvent
{
    public long Id { get; set; }
    public string? UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string? TargetType { get; set; }
    public string? TargetId { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string? IpAddress { get; set; }
    public bool Success { get; set; } = true;
    public string? MetadataJson { get; set; }
}
