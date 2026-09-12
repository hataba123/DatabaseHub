namespace DBHub.Api.Services.Sync;

public interface ISyncExecutionEngine
{
    Task ExecutePlanAsync(
        string executionId,
        string planId,
        string userId,
        string username,
        CancellationToken cancellationToken = default);
}
