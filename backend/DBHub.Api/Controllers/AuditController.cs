using System.Security.Claims;
using DBHub.Api.DTOs;
using DBHub.Api.Models.Auth;
using DBHub.Api.Security;
using DBHub.Api.Services.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DBHub.Api.Controllers;

[ApiController]
[Route("api/audit-logs")]
[Authorize]
public class AuditController : ControllerBase
{
    private readonly IAuditService _auditService;
    private readonly IPermissionService _permissionService;

    public AuditController(IAuditService auditService, IPermissionService permissionService)
    {
        _auditService = auditService;
        _permissionService = permissionService;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<AuditEvent>>> GetAuditLogs(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? action = null,
        [FromQuery] string? username = null,
        CancellationToken cancellationToken = default)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.AuditView, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to view audit logs." });
        }

        var result = await _auditService.GetAuditLogsAsync(page, pageSize, action, username, cancellationToken);
        return Ok(result);
    }
}
