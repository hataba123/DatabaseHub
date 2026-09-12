using System.Security.Claims;
using DBHub.Api.DTOs;
using DBHub.Api.Security;
using DBHub.Api.Services.Auth;
using DBHub.Api.Services.Compare;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DBHub.Api.Controllers;

[ApiController]
[Route("api/compare")]
[Authorize]
public class CompareController : ControllerBase
{
    private readonly ICompareService _compareService;
    private readonly IPermissionService _permissionService;
    private readonly ILogger<CompareController> _logger;

    public CompareController(
        ICompareService compareService,
        IPermissionService permissionService,
        ILogger<CompareController> logger)
    {
        _compareService = compareService;
        _permissionService = permissionService;
        _logger = logger;
    }

    [HttpGet("sessions")]
    public async Task<ActionResult<IReadOnlyList<CompareSessionDto>>> GetSessions(CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.DatabaseRead, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to view compare sessions." });
        }

        var sessions = await _compareService.GetCompareSessionsAsync(cancellationToken);
        return Ok(sessions);
    }

    [HttpPost("sessions")]
    public async Task<ActionResult<CompareSessionDto>> CreateSession(
        [FromBody] CreateCompareSessionRequest request,
        CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.DatabaseRead, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to create compare sessions." });
        }

        var session = await _compareService.CreateCompareSessionAsync(request, currentUserId, cancellationToken);
        return StatusCode(201, session);
    }

    [HttpGet("sessions/{id}")]
    public async Task<ActionResult<CompareSessionDto>> GetSessionById(string id, CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.DatabaseRead, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to view compare session details." });
        }

        var session = await _compareService.GetCompareSessionByIdAsync(id, cancellationToken);
        if (session == null)
        {
            return NotFound(new ErrorResponse { Code = "NOT_FOUND", Message = $"Compare session '{id}' was not found." });
        }

        return Ok(session);
    }
}
