using System.Text.Json;
using DBHub.Api.Models;

namespace DBHub.Api.Repositories;

public class JsonDatabaseConnectionStore : IDatabaseConnectionStore
{
    private readonly string _filePath;
    private readonly SemaphoreSlim _semaphore = new(1, 1);
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };

    public JsonDatabaseConnectionStore(IWebHostEnvironment environment)
    {
        var dataDir = Path.Combine(environment.ContentRootPath, "App_Data");
        if (!Directory.Exists(dataDir))
        {
            Directory.CreateDirectory(dataDir);
        }
        _filePath = Path.Combine(dataDir, "connections.json");
    }

    public async Task<IReadOnlyList<DatabaseConnection>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        await _semaphore.WaitAsync(cancellationToken);
        try
        {
            if (!File.Exists(_filePath))
            {
                var seed = GetDefaultSeedConnections();
                await File.WriteAllTextAsync(_filePath, JsonSerializer.Serialize(seed, JsonOptions), cancellationToken);
                return seed;
            }

            var json = await File.ReadAllTextAsync(_filePath, cancellationToken);
            var list = JsonSerializer.Deserialize<List<DatabaseConnection>>(json, JsonOptions);
            return list ?? new List<DatabaseConnection>();
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<DatabaseConnection?> GetByIdAsync(string id, CancellationToken cancellationToken = default)
    {
        var all = await GetAllAsync(cancellationToken);
        return all.FirstOrDefault(c => string.Equals(c.Id, id, StringComparison.OrdinalIgnoreCase));
    }

    public async Task<DatabaseConnection> SaveAsync(DatabaseConnection connection, CancellationToken cancellationToken = default)
    {
        await _semaphore.WaitAsync(cancellationToken);
        try
        {
            List<DatabaseConnection> list = new();
            if (File.Exists(_filePath))
            {
                var json = await File.ReadAllTextAsync(_filePath, cancellationToken);
                list = JsonSerializer.Deserialize<List<DatabaseConnection>>(json, JsonOptions) ?? new();
            }

            if (string.IsNullOrWhiteSpace(connection.Id))
            {
                connection.Id = Guid.NewGuid().ToString("N");
            }

            var index = list.FindIndex(c => string.Equals(c.Id, connection.Id, StringComparison.OrdinalIgnoreCase));
            if (index >= 0)
            {
                list[index] = connection;
            }
            else
            {
                list.Add(connection);
            }

            await File.WriteAllTextAsync(_filePath, JsonSerializer.Serialize(list, JsonOptions), cancellationToken);
            return connection;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken cancellationToken = default)
    {
        await _semaphore.WaitAsync(cancellationToken);
        try
        {
            if (!File.Exists(_filePath)) return false;

            var json = await File.ReadAllTextAsync(_filePath, cancellationToken);
            var list = JsonSerializer.Deserialize<List<DatabaseConnection>>(json, JsonOptions) ?? new();
            var countBefore = list.Count;
            list.RemoveAll(c => string.Equals(c.Id, id, StringComparison.OrdinalIgnoreCase));

            if (list.Count < countBefore)
            {
                await File.WriteAllTextAsync(_filePath, JsonSerializer.Serialize(list, JsonOptions), cancellationToken);
                return true;
            }

            return false;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    private static List<DatabaseConnection> GetDefaultSeedConnections()
    {
        return new List<DatabaseConnection>
        {
            new()
            {
                Id = "pmsc-prod",
                Name = "PMSC Production",
                Environment = "Production",
                Server = "localhost",
                Port = 1433,
                Database = "PMSC_PROD_DB",
                AuthenticationType = DatabaseAuthenticationType.SqlServer,
                Username = "sa",
                Password = "Password123!",
                Encrypt = true,
                TrustServerCertificate = true,
                Status = "Online",
                CreatedAt = DateTime.UtcNow.AddMonths(-6)
            },
            new()
            {
                Id = "hr-prod",
                Name = "HR Database",
                Environment = "Production",
                Server = "localhost",
                Port = 1433,
                Database = "HRM_GLOBAL",
                AuthenticationType = DatabaseAuthenticationType.SqlServer,
                Username = "sa",
                Password = "Password123!",
                Encrypt = true,
                TrustServerCertificate = true,
                Status = "Online",
                CreatedAt = DateTime.UtcNow.AddMonths(-4)
            }
        };
    }
}
