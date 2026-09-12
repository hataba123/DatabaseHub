using DBHub.Api.DTOs;
using DBHub.Api.Models.Auth;

namespace DBHub.Api.Services.Auth;

public interface IAuditService
{
    Task LogAuthEventAsync(
        string? userId,
        string username,
        string action,
        string? targetType = null,
        string? targetId = null,
        string? ipAddress = null,
        bool success = true,
        object? metadata = null,
        CancellationToken cancellationToken = default);

    Task<PagedResult<AuditEvent>> GetAuditLogsAsync(
        int page = 1,
        int pageSize = 50,
        string? action = null,
        string? username = null,
        CancellationToken cancellationToken = default);
}
