using DBHub.Api.Models;
using Microsoft.Data.SqlClient;

namespace DBHub.Api.Services;

public interface ISqlConnectionFactory
{
    SqlConnection CreateConnection(DatabaseConnection connection, string? overrideDatabase = null);
    string BuildConnectionString(DatabaseConnection connection, string? overrideDatabase = null);
}
