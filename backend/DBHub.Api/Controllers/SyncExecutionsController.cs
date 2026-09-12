using System.Security.Claims;
using DBHub.Api.Data;
using DBHub.Api.DTOs;
using DBHub.Api.Infrastructure;
using DBHub.Api.Models.Sync;
using DBHub.Api.Security;
using DBHub.Api.Services.Auth;
using DBHub.Api.Services.Sync;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DBHub.Api.Controllers;

[ApiController]
[Route("api/sync")]
[Authorize]
public class SyncExecutionsController : ControllerBase
{
    private readonly DBHubDbContext _dbContext;
    private readonly ISyncJobQueue _jobQueue;
    private readonly ISyncPlanService _planService;
    private readonly IPermissionService _permissionService;
    private readonly ILogger<SyncExecutionsController> _logger;

    public SyncExecutionsController(
        DBHubDbContext dbContext,
        ISyncJobQueue jobQueue,
        ISyncPlanService planService,
        IPermissionService permissionService,
        ILogger<SyncExecutionsController> logger)
    {
        _dbContext = dbContext;
        _jobQueue = jobQueue;
        _planService = planService;
        _permissionService = permissionService;
        _logger = logger;
    }

    [HttpPost("plans/{planId}/execute")]
    public async Task<ActionResult> ExecutePlan(string planId, CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        var currentUsername = User.FindFirst(ClaimTypes.Name)?.Value ?? currentUserId;

        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.SyncExecute, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to execute sync plans." });
        }

        var plan = await _dbContext.SyncPlans.FirstOrDefaultAsync(p => p.Id == planId, cancellationToken);
        if (plan == null)
        {
            return NotFound(new ErrorResponse { Code = "NOT_FOUND", Message = $"Sync plan '{planId}' was not found." });
        }

        if (string.Equals(plan.Environment, "Production", StringComparison.OrdinalIgnoreCase))
        {
            if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.SyncExecuteProduction, null, cancellationToken) &&
                !await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.All, null, cancellationToken))
            {
                return StatusCode(403, new ErrorResponse { Code = "PRODUCTION_EXECUTE_FORBIDDEN", Message = "Executing sync on Production target requires Sync.ExecuteProduction permission." });
            }
        }

        if (plan.ApprovalRequired && plan.Status != SyncPlanStatus.Approved)
        {
            return StatusCode(400, new ErrorResponse
            {
                Code = "SYNC_PLAN_NOT_APPROVED",
                Message = $"Plan requires approval before execution. Current status is '{plan.Status}'."
            });
        }

        if (plan.Status is SyncPlanStatus.Executing)
        {
            return StatusCode(409, new ErrorResponse { Code = "SYNC_ALREADY_STARTED", Message = "This sync plan is already currently executing." });
        }

        if (plan.Status is SyncPlanStatus.Completed or SyncPlanStatus.CompletedWithErrors)
        {
            return StatusCode(400, new ErrorResponse { Code = "SYNC_ALREADY_COMPLETED", Message = "This sync plan has already completed. Create a new plan to sync again." });
        }

        var execution = new SyncExecution
        {
            Id = Guid.NewGuid().ToString(),
            SyncPlanId = plan.Id,
            StartedByUserId = currentUserId,
            StartedByUsername = currentUsername,
            StartedAt = DateTime.UtcNow,
            Status = SyncExecutionStatus.Pending,
            TotalOperations = plan.InsertCount + plan.UpdateCount + plan.DeleteCount
        };

        _dbContext.SyncExecutions.Add(execution);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var task = new SyncJobTask
        {
            ExecutionId = execution.Id,
            PlanId = plan.Id,
            UserId = currentUserId,
            Username = currentUsername
        };

        await _jobQueue.EnqueueAsync(task, cancellationToken);

        return Accepted(new
        {
            executionId = execution.Id,
            planId = plan.Id,
            status = execution.Status,
            message = "Sync execution queued successfully."
        });
    }

    [HttpGet("executions/{id}")]
    public async Task<ActionResult<SyncExecutionProgressResponse>> GetExecutionStatus(string id, CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.SyncView, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to view sync execution status." });
        }

        var execution = await _dbContext.SyncExecutions.FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
        if (execution == null)
        {
            return NotFound(new ErrorResponse { Code = "NOT_FOUND", Message = $"Sync execution '{id}' was not found." });
        }

        return Ok(new SyncExecutionProgressResponse
        {
            Id = execution.Id,
            SyncPlanId = execution.SyncPlanId,
            Status = execution.Status,
            StartedByUsername = execution.StartedByUsername,
            StartedAt = execution.StartedAt,
            CompletedAt = execution.CompletedAt,
            CurrentTable = execution.CurrentTable,
            CurrentOperation = execution.CurrentOperation,
            TotalOperations = execution.TotalOperations,
            CompletedOperations = execution.CompletedOperations,
            FailedOperations = execution.FailedOperations,
            SkippedOperations = execution.SkippedOperations,
            ConflictOperations = execution.ConflictOperations,
            ProgressPercent = execution.ProgressPercent,
            ErrorMessage = execution.ErrorMessage
        });
    }

    [HttpGet("executions")]
    public async Task<ActionResult<PagedResult<SyncExecutionProgressResponse>>> GetExecutions(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.SyncViewHistory, null, cancellationToken) &&
            !await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.SyncView, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to view sync history." });
        }

        var total = await _dbContext.SyncExecutions.CountAsync(cancellationToken);
        var items = await _dbContext.SyncExecutions
            .OrderByDescending(e => e.StartedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(e => new SyncExecutionProgressResponse
            {
                Id = e.Id,
                SyncPlanId = e.SyncPlanId,
                Status = e.Status,
                StartedByUsername = e.StartedByUsername,
                StartedAt = e.StartedAt,
                CompletedAt = e.CompletedAt,
                CurrentTable = e.CurrentTable,
                TotalOperations = e.TotalOperations,
                CompletedOperations = e.CompletedOperations,
                FailedOperations = e.FailedOperations,
                SkippedOperations = e.SkippedOperations,
                ConflictOperations = e.ConflictOperations,
                ProgressPercent = e.ProgressPercent,
                ErrorMessage = e.ErrorMessage
            })
            .ToListAsync(cancellationToken);

        return Ok(new PagedResult<SyncExecutionProgressResponse>
        {
            Items = items,
            TotalRows = total,
            Page = page,
            PageSize = pageSize
        });
    }

    [HttpPost("executions/{id}/cancel")]
    public async Task<ActionResult> CancelExecution(string id, CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.SyncCancel, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to cancel sync execution." });
        }

        var cancelled = _jobQueue.CancelExecution(id);
        var execution = await _dbContext.SyncExecutions.FirstOrDefaultAsync(e => e.Id == id, cancellationToken);
        if (execution != null && execution.Status is SyncExecutionStatus.Pending or SyncExecutionStatus.Executing)
        {
            execution.Status = SyncExecutionStatus.Cancelled;
            execution.ErrorMessage = "Execution was cancelled by user.";
            execution.CompletedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return Ok(new { success = true, cancelled, message = "Cancellation requested successfully." });
    }

    [HttpPost("executions/{id}/reversal-plan")]
    public async Task<ActionResult<ReversalPlanResponse>> CreateReversalPlan(string id, CancellationToken cancellationToken)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        var currentUsername = User.FindFirst(ClaimTypes.Name)?.Value ?? currentUserId;

        if (!await _permissionService.HasPermissionAsync(currentUserId, PermissionDefinitions.SyncCreatePlan, null, cancellationToken))
        {
            return StatusCode(403, new ErrorResponse { Code = "FORBIDDEN", Message = "You do not have permission to create reversal plans." });
        }

        var res = await _planService.CreateReversalPlanAsync(id, currentUserId, currentUsername, cancellationToken);
        return StatusCode(201, res);
    }
}
