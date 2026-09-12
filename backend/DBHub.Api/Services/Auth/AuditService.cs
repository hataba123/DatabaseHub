using System.Text.Json;
using DBHub.Api.Data;
using DBHub.Api.DTOs;
using DBHub.Api.Models.Auth;
using Microsoft.EntityFrameworkCore;

namespace DBHub.Api.Services.Auth;

public class AuditService : IAuditService
{
    private readonly DBHubDbContext _context;
    private readonly ILogger<AuditService> _logger;

    public AuditService(DBHubDbContext context, ILogger<AuditService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task LogAuthEventAsync(
        string? userId,
        string username,
        string action,
        string? targetType = null,
        string? targetId = null,
        string? ipAddress = null,
        bool success = true,
        object? metadata = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var auditEvent = new AuditEvent
            {
                UserId = userId,
                Username = username,
                Action = action,
                TargetType = targetType,
                TargetId = targetId,
                IpAddress = ipAddress,
                Success = success,
                Timestamp = DateTime.UtcNow,
                MetadataJson = metadata != null ? JsonSerializer.Serialize(metadata) : null
            };

            _context.AuditEvents.Add(auditEvent);
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to record audit event for action {Action} and user {Username}", action, username);
        }
    }

    public async Task<PagedResult<AuditEvent>> GetAuditLogsAsync(
        int page = 1,
        int pageSize = 50,
        string? action = null,
        string? username = null,
        CancellationToken cancellationToken = default)
    {
        var query = _context.AuditEvents.AsQueryable();

        if (!string.IsNullOrWhiteSpace(action))
        {
            query = query.Where(a => a.Action.Contains(action));
        }

        if (!string.IsNullOrWhiteSpace(username))
        {
            query = query.Where(a => a.Username.Contains(username));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(a => a.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<AuditEvent>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalRows = total
        };
    }
}
