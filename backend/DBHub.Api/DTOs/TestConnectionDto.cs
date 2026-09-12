using DBHub.Api.Models;

namespace DBHub.Api.DTOs;

public class TestConnectionRequest
{
    public string Server { get; set; } = string.Empty;
    public int Port { get; set; } = 1433;
    public string Database { get; set; } = string.Empty;
    public DatabaseAuthenticationType AuthenticationType { get; set; } = DatabaseAuthenticationType.SqlServer;
    public string? Username { get; set; }
    public string? Password { get; set; }
    public bool Encrypt { get; set; } = true;
    public bool TrustServerCertificate { get; set; } = true;
}

public class TestConnectionResponse
{
    public bool Success { get; set; }
    public string? ServerVersion { get; set; }
    public string? Database { get; set; }
    public long ElapsedMilliseconds { get; set; }
    public string? Message { get; set; }
}
