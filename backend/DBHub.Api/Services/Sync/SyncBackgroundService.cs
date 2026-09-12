namespace DBHub.Api.Services.Sync;

public class SyncBackgroundService : BackgroundService
{
    private readonly ISyncJobQueue _jobQueue;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<SyncBackgroundService> _logger;

    public SyncBackgroundService(
        ISyncJobQueue jobQueue,
        IServiceProvider serviceProvider,
        ILogger<SyncBackgroundService> logger)
    {
        _jobQueue = jobQueue;
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("SyncBackgroundService is starting...");

        while (!stoppingToken.IsCancellationRequested)
        {
            SyncJobTask task;
            try
            {
                task = await _jobQueue.DequeueAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }

            try
            {
                using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken, task.CancellationTokenSource.Token);
                using var scope = _serviceProvider.CreateScope();

                var engine = scope.ServiceProvider.GetRequiredService<ISyncExecutionEngine>();
                await engine.ExecutePlanAsync(task.ExecutionId, task.PlanId, task.UserId, task.Username, linkedCts.Token);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred executing sync job task for plan '{PlanId}'.", task.PlanId);
            }
            finally
            {
                if (_jobQueue is SyncJobQueue queue)
                {
                    queue.RemoveActive(task.ExecutionId);
                }
            }
        }

        _logger.LogInformation("SyncBackgroundService is stopping.");
    }
}
