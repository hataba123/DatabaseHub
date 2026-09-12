using DBHub.Api.DTOs;

namespace DBHub.Api.Services.Sync;

public interface ISyncPlanService
{
    Task<SyncPlanResponse> CreatePlanAsync(
        CreateSyncPlanRequest request,
        string userId,
        string username,
        CancellationToken cancellationToken = default);

    Task<PagedResult<SyncPlanResponse>> GetPlansAsync(
        string? status = null,
        string? source = null,
        string? target = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default);

    Task<SyncPlanResponse?> GetPlanByIdAsync(
        string id,
        CancellationToken cancellationToken = default);

    Task<PagedResult<SyncOperationDto>> GetOperationsAsync(
        string planId,
        string? table = null,
        string? type = null,
        string? status = null,
        bool? selected = null,
        string? search = null,
        int page = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);

    Task<SyncPlanResponse> UpdateSelectionAsync(
        string planId,
        UpdateSelectionRequest request,
        string userId,
        CancellationToken cancellationToken = default);

    Task<ValidationSummaryResponse> ValidatePlanAsync(
        string planId,
        string userId,
        CancellationToken cancellationToken = default);

    Task<DryRunResultResponse> DryRunAsync(
        string planId,
        string userId,
        string username,
        string? ipAddress = null,
        CancellationToken cancellationToken = default);

    Task<SyncPlanResponse> ApprovePlanAsync(
        string planId,
        ApprovePlanRequest request,
        string userId,
        string username,
        CancellationToken cancellationToken = default);

    Task<SyncPlanResponse> RejectPlanAsync(
        string planId,
        RejectPlanRequest request,
        string userId,
        string username,
        CancellationToken cancellationToken = default);

    Task<ReversalPlanResponse> CreateReversalPlanAsync(
        string executionId,
        string userId,
        string username,
        CancellationToken cancellationToken = default);
}
