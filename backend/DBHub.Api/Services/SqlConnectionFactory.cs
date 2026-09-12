using DBHub.Api.Models;
using Microsoft.Data.SqlClient;

namespace DBHub.Api.Services;

public class SqlConnectionFactory : ISqlConnectionFactory
{
    public SqlConnection CreateConnection(DatabaseConnection connection, string? overrideDatabase = null)
    {
        var connStr = BuildConnectionString(connection, overrideDatabase);
        return new SqlConnection(connStr);
    }

    public string BuildConnectionString(DatabaseConnection connection, string? overrideDatabase = null)
    {
        var targetDb = !string.IsNullOrWhiteSpace(overrideDatabase)
            ? overrideDatabase
            : connection.Database;

        // If targetDb is still empty, default to master for initial server-level operations
        if (string.IsNullOrWhiteSpace(targetDb))
        {
            targetDb = "master";
        }

        var port = connection.Port > 0 ? connection.Port : 1433;
        var server = connection.Server.Trim();
        var dataSource = server.Contains(',') ? server : $"{server},{port}";

        var builder = new SqlConnectionStringBuilder
        {
            DataSource = dataSource,
            InitialCatalog = targetDb,
            Encrypt = connection.Encrypt,
            TrustServerCertificate = connection.TrustServerCertificate,
            ConnectTimeout = 15,
            ApplicationName = "DBHub-Enterprise"
        };

        if (connection.AuthenticationType == DatabaseAuthenticationType.Windows)
        {
            builder.IntegratedSecurity = true;
        }
        else
        {
            builder.IntegratedSecurity = false;
            builder.UserID = connection.Username ?? string.Empty;
            builder.Password = connection.Password ?? string.Empty;
        }

        return builder.ConnectionString;
    }
}
