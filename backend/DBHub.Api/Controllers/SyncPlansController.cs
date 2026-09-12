using System.Security.Claims;
using DBHub.Api.DTOs;
using DBHub.Api.Security;
using DBHub.Api.Services.Auth;
using DBHub.Api.Services.Sync;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DBHub.Api.Controllers;

[ApiController]
[Route("api/sync/plans")]
[Authorize]
public class SyncPlansController : ControllerBase
{
    private readonly ISyncPlanService _planService;
    private readonly IPermissionService _permissionService;
    private readonly ILogger<SyncPlansController> _logger;

    public SyncPlansController(
        ISyncPlanService planService,
        IPermissionService permissionService,
        ILogger<SyncPlansController> logger)
    {
        _planService = planService;
        _permissionService = permissionService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<SyncPlanResponse>>> GetPlans(
        [FromQuery] string? status = null,
        [FromQuery] string? source = null,
        [FromQuery] string? target = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.SyncView, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to view sync plans." });
        }

        var result = await _planService.GetPlansAsync(status, source, target, page, pageSize, cancellationToken);
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<SyncPlanResponse>> CreatePlan(
        [FromBody] CreateSyncPlanRequest request,
        CancellationToken cancellationToken = default)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        var currentUsername = User.FindFirst(ClaimTypes.Name)?.Value ?? currentUserId;

        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.SyncCreatePlan, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to create sync plans." });
        }

        var plan = await _planService.CreatePlanAsync(request, currentUserId, currentUsername, cancellationToken);
        return StatusCode(201, plan);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<SyncPlanResponse>> GetPlanById(string id, CancellationToken cancellationToken = default)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.SyncView, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to view sync plans." });
        }

        var plan = await _planService.GetPlanByIdAsync(id, cancellationToken);
        if (plan == null)
        {
            return NotFound(new ErrorResponse { Code = "NOT_FOUND", Message = $"Sync plan '{id}' was not found." });
        }

        return Ok(plan);
    }

    [HttpGet("{id}/operations")]
    public async Task<ActionResult<PagedResult<SyncOperationDto>>> GetOperations(
        string id,
        [FromQuery] string? table = null,
        [FromQuery] string? type = null,
        [FromQuery] string? status = null,
        [FromQuery] bool? selected = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.SyncView, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to view sync operations." });
        }

        var result = await _planService.GetOperationsAsync(id, table, type, status, selected, search, page, pageSize, cancellationToken);
        return Ok(result);
    }

    [HttpPost("{id}/selection")]
    public async Task<ActionResult<SyncPlanResponse>> UpdateSelection(
        string id,
        [FromBody] UpdateSelectionRequest request,
        CancellationToken cancellationToken = default)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.SyncCreatePlan, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to modify sync plan selection." });
        }

        var updated = await _planService.UpdateSelectionAsync(id, request, currentUserId, cancellationToken);
        return Ok(updated);
    }

    [HttpPost("{id}/validate")]
    public async Task<ActionResult<ValidationSummaryResponse>> ValidatePlan(string id, CancellationToken cancellationToken = default)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.SyncView, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to validate sync plans." });
        }

        var validation = await _planService.ValidatePlanAsync(id, currentUserId, cancellationToken);
        return Ok(validation);
    }

    [HttpPost("{id}/dry-run")]
    public async Task<ActionResult<DryRunResultResponse>> DryRun(string id, CancellationToken cancellationToken = default)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        var currentUsername = User.FindFirst(ClaimTypes.Name)?.Value ?? currentUserId;

        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.SyncCreatePlan, null, cancellationToken) &&
            !await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.SyncExecute, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to perform dry run on sync plans." });
        }

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var dryRunResult = await _planService.DryRunAsync(id, currentUserId, currentUsername, ip, cancellationToken);
        return Ok(dryRunResult);
    }

    [HttpPost("{id}/approve")]
    public async Task<ActionResult<SyncPlanResponse>> ApprovePlan(
        string id,
        [FromBody] ApprovePlanRequest request,
        CancellationToken cancellationToken = default)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        var currentUsername = User.FindFirst(ClaimTypes.Name)?.Value ?? currentUserId;

        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.SyncApprove, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to approve sync plans." });
        }

        var approved = await _planService.ApprovePlanAsync(id, request, currentUserId, currentUsername, cancellationToken);
        return Ok(approved);
    }

    [HttpPost("{id}/reject")]
    public async Task<ActionResult<SyncPlanResponse>> RejectPlan(
        string id,
        [FromBody] RejectPlanRequest request,
        CancellationToken cancellationToken = default)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        var currentUsername = User.FindFirst(ClaimTypes.Name)?.Value ?? currentUserId;

        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.SyncApprove, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to reject sync plans." });
        }

        var rejected = await _planService.RejectPlanAsync(id, request, currentUserId, currentUsername, cancellationToken);
        return Ok(rejected);
    }
}
