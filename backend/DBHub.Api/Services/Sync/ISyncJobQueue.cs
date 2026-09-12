using System.Collections.Concurrent;
using System.Threading.Channels;

namespace DBHub.Api.Services.Sync;

public class SyncJobTask
{
    public string ExecutionId { get; set; } = string.Empty;
    public string PlanId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public CancellationTokenSource CancellationTokenSource { get; set; } = new();
}

public interface ISyncJobQueue
{
    ValueTask EnqueueAsync(SyncJobTask task, CancellationToken cancellationToken = default);
    ValueTask<SyncJobTask> DequeueAsync(CancellationToken cancellationToken = default);
    bool CancelExecution(string executionId);
    bool IsExecutionActive(string executionId);
}

public class SyncJobQueue : ISyncJobQueue
{
    private readonly Channel<SyncJobTask> _channel = Channel.CreateUnbounded<SyncJobTask>();
    private readonly ConcurrentDictionary<string, SyncJobTask> _activeJobs = new();

    public ValueTask EnqueueAsync(SyncJobTask task, CancellationToken cancellationToken = default)
    {
        _activeJobs[task.ExecutionId] = task;
        return _channel.Writer.WriteAsync(task, cancellationToken);
    }

    public async ValueTask<SyncJobTask> DequeueAsync(CancellationToken cancellationToken = default)
    {
        var task = await _channel.Reader.ReadAsync(cancellationToken);
        return task;
    }

    public bool CancelExecution(string executionId)
    {
        if (_activeJobs.TryGetValue(executionId, out var task))
        {
            task.CancellationTokenSource.Cancel();
            return true;
        }
        return false;
    }

    public bool IsExecutionActive(string executionId)
    {
        return _activeJobs.ContainsKey(executionId);
    }

    public void RemoveActive(string executionId)
    {
        _activeJobs.TryRemove(executionId, out _);
    }
}
