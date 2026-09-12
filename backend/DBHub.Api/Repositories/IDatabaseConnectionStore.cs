using DBHub.Api.Models;

namespace DBHub.Api.Repositories;

public interface IDatabaseConnectionStore
{
    Task<IReadOnlyList<DatabaseConnection>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<DatabaseConnection?> GetByIdAsync(string id, CancellationToken cancellationToken = default);
    Task<DatabaseConnection> SaveAsync(DatabaseConnection connection, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(string id, CancellationToken cancellationToken = default);
}
