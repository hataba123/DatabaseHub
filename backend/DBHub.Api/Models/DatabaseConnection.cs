namespace DBHub.Api.Models;

public enum DatabaseAuthenticationType
{
    SqlServer,
    Windows
}

public class DatabaseConnection
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Name { get; set; } = string.Empty;
    public string Environment { get; set; } = "Development";
    public string Server { get; set; } = string.Empty;
    public int Port { get; set; } = 1433;
    public string Database { get; set; } = string.Empty;
    public DatabaseAuthenticationType AuthenticationType { get; set; } = DatabaseAuthenticationType.SqlServer;
    public string? Username { get; set; }
    public string? Password { get; set; }
    public bool Encrypt { get; set; } = true;
    public bool TrustServerCertificate { get; set; } = true;
    public bool IsEnabled { get; set; } = true;
    public bool AllowWrite { get; set; } = true;
    public string Status { get; set; } = "Online";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
