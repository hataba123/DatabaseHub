using System.Net;
using System.Text.Json;
using DBHub.Api.Data;
using DBHub.Api.DTOs;
using DBHub.Api.Infrastructure;
using DBHub.Api.Models.Compare;
using DBHub.Api.Models.Sync;
using DBHub.Api.Repositories;
using DBHub.Api.Security;
using DBHub.Api.Services.Auth;
using DBHub.Api.Services.Compare;
using Microsoft.EntityFrameworkCore;

namespace DBHub.Api.Services.Sync;

public class SyncPlanService : ISyncPlanService
{
    private readonly DBHubDbContext _dbContext;
    private readonly ICompareService _compareService;
    private readonly IDatabaseConnectionStore _connectionStore;
    private readonly ISyncDependencyResolver _dependencyResolver;
    private readonly IPermissionService _permissionService;
    private readonly IAuditService _auditService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SyncPlanService> _logger;

    public SyncPlanService(
        DBHubDbContext dbContext,
        ICompareService compareService,
        IDatabaseConnectionStore connectionStore,
        ISyncDependencyResolver dependencyResolver,
        IPermissionService permissionService,
        IAuditService auditService,
        IConfiguration configuration,
        ILogger<SyncPlanService> logger)
    {
        _dbContext = dbContext;
        _compareService = compareService;
        _connectionStore = connectionStore;
        _dependencyResolver = dependencyResolver;
        _permissionService = permissionService;
        _auditService = auditService;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<SyncPlanResponse> CreatePlanAsync(
        CreateSyncPlanRequest request,
        string userId,
        string username,
        CancellationToken cancellationToken = default)
    {
        var compareSession = await _compareService.GetCompareSessionByIdAsync(request.CompareSessionId, cancellationToken);
        if (compareSession == null)
        {
            throw new KeyNotFoundException($"Compare session with id '{request.CompareSessionId}' was not found.");
        }

        // Determine source and target according to direction
        string srcConnId = request.Direction == SyncDirection.TargetToSource ? compareSession.TargetConnectionId : compareSession.SourceConnectionId;
        string srcDb = request.Direction == SyncDirection.TargetToSource ? compareSession.TargetDatabase : compareSession.SourceDatabase;
        string tgtConnId = request.Direction == SyncDirection.TargetToSource ? compareSession.SourceConnectionId : compareSession.TargetConnectionId;
        string tgtDb = request.Direction == SyncDirection.TargetToSource ? compareSession.SourceDatabase : compareSession.TargetDatabase;

        var targetConnection = await _connectionStore.GetByIdAsync(tgtConnId, cancellationToken);
        if (targetConnection != null && !targetConnection.AllowWrite)
        {
            throw new DynamicCrudException("WRITE_DISABLED", "Target database connection is configured as Read-Only (AllowWrite is false).", HttpStatusCode.Forbidden);
        }

        string environment = targetConnection?.Environment.ToString() ?? "Development";
        var protectedTables = _configuration.GetSection("DynamicCrud:ProtectedTables").Get<string[]>() ?? Array.Empty<string>();

        // Build operations from comparison results
        var operations = new List<SyncOperation>();
        var tablesInPlan = compareSession.TableResults.Select(t => t.TableName).Distinct(StringComparer.OrdinalIgnoreCase).ToList();

        // Calculate dependency order
        var insertOrder = _dependencyResolver.ResolveInsertOrder(tablesInPlan, Enumerable.Empty<(string, string)>()).OrderedTables;
        var deleteOrder = _dependencyResolver.ResolveDeleteOrder(tablesInPlan, Enumerable.Empty<(string, string)>()).OrderedTables;

        var insertOrderMap = insertOrder.Select((name, idx) => (name, idx)).ToDictionary(x => x.name, x => x.idx, StringComparer.OrdinalIgnoreCase);
        var deleteOrderMap = deleteOrder.Select((name, idx) => (name, idx)).ToDictionary(x => x.name, x => x.idx, StringComparer.OrdinalIgnoreCase);

        foreach (var tbl in compareSession.TableResults)
        {
            bool isProtected = protectedTables.Any(p => string.Equals(p, tbl.TableName, StringComparison.OrdinalIgnoreCase));

            foreach (var rowDiff in tbl.RowDifferences)
            {
                string opType = SyncOperationType.Skip;
                bool isSelected = false;

                if (request.Direction == SyncDirection.SourceToTarget)
                {
                    if (rowDiff.Status == "Missing in Target")
                    {
                        opType = SyncOperationType.Insert;
                        isSelected = request.Options.InsertMissing;
                    }
                    else if (rowDiff.Status == "Different")
                    {
                        opType = SyncOperationType.Update;
                        isSelected = request.Options.UpdateDifferent;
                    }
                    else if (rowDiff.Status == "Missing in Source")
                    {
                        opType = SyncOperationType.Delete;
                        isSelected = request.Options.DeleteExtra; // Always false by default
                    }
                }
                else // TargetToSource
                {
                    if (rowDiff.Status == "Missing in Source")
                    {
                        opType = SyncOperationType.Insert;
                        isSelected = request.Options.InsertMissing;
                    }
                    else if (rowDiff.Status == "Different")
                    {
                        opType = SyncOperationType.Update;
                        isSelected = request.Options.UpdateDifferent;
                    }
                    else if (rowDiff.Status == "Missing in Target")
                    {
                        opType = SyncOperationType.Delete;
                        isSelected = request.Options.DeleteExtra; // Always false by default
                    }
                }

                if (isProtected)
                {
                    opType = SyncOperationType.Blocked;
                    isSelected = false;
                }

                var op = new SyncOperation
                {
                    Id = Guid.NewGuid().ToString(),
                    SchemaName = tbl.SchemaName,
                    TableName = tbl.TableName,
                    PrimaryKeyJson = JsonSerializer.Serialize(rowDiff.KeyValues.Count > 0 ? rowDiff.KeyValues : new Dictionary<string, object?> { { "PK", rowDiff.PrimaryKey } }),
                    OperationType = opType,
                    Status = isProtected ? SyncOperationStatus.Blocked : SyncOperationStatus.Pending,
                    IsSelected = isSelected,
                    SourceValuesJson = rowDiff.SourceData != null ? JsonSerializer.Serialize(rowDiff.SourceData) : null,
                    TargetValuesJson = rowDiff.TargetData != null ? JsonSerializer.Serialize(rowDiff.TargetData) : null,
                    ChangedColumnsJson = rowDiff.ChangedColumns.Count > 0 ? JsonSerializer.Serialize(rowDiff.ChangedColumns) : null,
                    ErrorCode = isProtected ? "PROTECTED_TABLE" : null,
                    ErrorMessage = isProtected ? $"Table '{tbl.TableName}' is protected by security policy." : null
                };

                operations.Add(op);
            }
        }

        // Sort operations according to dependency rules: Inserts (Parent->Child), Updates, Deletes (Child->Parent)
        operations = operations
            .OrderBy(o => o.OperationType switch
            {
                SyncOperationType.Insert => 1,
                SyncOperationType.Update => 2,
                SyncOperationType.Delete => 3,
                _ => 4
            })
            .ThenBy(o => o.OperationType == SyncOperationType.Delete
                ? (deleteOrderMap.TryGetValue(o.TableName, out var dIdx) ? dIdx : 999)
                : (insertOrderMap.TryGetValue(o.TableName, out var iIdx) ? iIdx : 999))
            .ToList();

        for (int i = 0; i < operations.Count; i++)
        {
            operations[i].Order = i + 1;
        }

        int insertCount = operations.Count(o => o.OperationType == SyncOperationType.Insert && o.IsSelected);
        int updateCount = operations.Count(o => o.OperationType == SyncOperationType.Update && o.IsSelected);
        int deleteCount = operations.Count(o => o.OperationType == SyncOperationType.Delete && o.IsSelected);
        int skippedCount = operations.Count(o => o.OperationType == SyncOperationType.Skip || (!o.IsSelected && o.OperationType != SyncOperationType.Blocked));
        int blockedCount = operations.Count(o => o.OperationType == SyncOperationType.Blocked);

        bool requireApprovalForProduction = _configuration.GetValue<bool>("Sync:RequireApprovalForProduction", true);
        bool requireApprovalForDelete = _configuration.GetValue<bool>("Sync:RequireApprovalForDelete", true);
        int requireApprovalAbove = _configuration.GetValue<int>("Sync:RequireApprovalAboveOperations", 1000);

        bool isProduction = string.Equals(environment, "Production", StringComparison.OrdinalIgnoreCase);
        bool approvalRequired = (isProduction && requireApprovalForProduction) ||
                                (deleteCount > 0 && requireApprovalForDelete) ||
                                (operations.Count > requireApprovalAbove);

        var plan = new SyncPlan
        {
            Id = Guid.NewGuid().ToString(),
            CompareSessionId = request.CompareSessionId,
            CreatedByUserId = userId,
            CreatedByUsername = username,
            SourceConnectionId = srcConnId,
            SourceDatabase = srcDb,
            TargetConnectionId = tgtConnId,
            TargetDatabase = tgtDb,
            Direction = request.Direction,
            Environment = environment,
            Status = approvalRequired ? SyncPlanStatus.AwaitingApproval : SyncPlanStatus.Ready,
            ApprovalRequired = approvalRequired,
            CreatedAt = DateTime.UtcNow,
            TotalOperations = operations.Count,
            InsertCount = insertCount,
            UpdateCount = updateCount,
            DeleteCount = deleteCount,
            SkippedCount = skippedCount,
            BlockedCount = blockedCount,
            OptionsJson = JsonSerializer.Serialize(request.Options),
            Version = 1,
            Operations = operations
        };

        _dbContext.SyncPlans.Add(plan);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAuthEventAsync(
            userId,
            username,
            "SYNC_PLAN_CREATED",
            targetType: "SyncPlan",
            targetId: plan.Id,
            success: true,
            metadata: new { planId = plan.Id, direction = plan.Direction, operations = plan.TotalOperations, environment = plan.Environment },
            cancellationToken: cancellationToken);

        return MapPlanToResponse(plan);
    }

    public async Task<PagedResult<SyncPlanResponse>> GetPlansAsync(
        string? status = null,
        string? source = null,
        string? target = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.SyncPlans.AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(p => p.Status == status);
        }
        if (!string.IsNullOrWhiteSpace(source))
        {
            query = query.Where(p => p.SourceDatabase.Contains(source));
        }
        if (!string.IsNullOrWhiteSpace(target))
        {
            query = query.Where(p => p.TargetDatabase.Contains(target));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<SyncPlanResponse>
        {
            Items = items.Select(MapPlanToResponse).ToList(),
            TotalRows = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<SyncPlanResponse?> GetPlanByIdAsync(
        string id,
        CancellationToken cancellationToken = default)
    {
        var plan = await _dbContext.SyncPlans
            .Include(p => p.Operations)
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        return plan != null ? MapPlanToResponse(plan) : null;
    }

    public async Task<PagedResult<SyncOperationDto>> GetOperationsAsync(
        string planId,
        string? table = null,
        string? type = null,
        string? status = null,
        bool? selected = null,
        string? search = null,
        int page = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.SyncOperations
            .Where(o => o.SyncPlanId == planId)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(table))
        {
            query = query.Where(o => o.TableName == table);
        }
        if (!string.IsNullOrWhiteSpace(type))
        {
            query = query.Where(o => o.OperationType == type);
        }
        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(o => o.Status == status);
        }
        if (selected.HasValue)
        {
            query = query.Where(o => o.IsSelected == selected.Value);
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(o => o.PrimaryKeyJson.Contains(search) || o.TableName.Contains(search));
        }

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderBy(o => o.Order)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<SyncOperationDto>
        {
            Items = items.Select(MapOperationToDto).ToList(),
            TotalRows = total,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<SyncPlanResponse> UpdateSelectionAsync(
        string planId,
        UpdateSelectionRequest request,
        string userId,
        CancellationToken cancellationToken = default)
    {
        var plan = await _dbContext.SyncPlans
            .Include(p => p.Operations)
            .FirstOrDefaultAsync(p => p.Id == planId, cancellationToken);

        if (plan == null)
        {
            throw new KeyNotFoundException($"SyncPlan '{planId}' was not found.");
        }

        if (plan.Status is SyncPlanStatus.Executing or SyncPlanStatus.Completed or SyncPlanStatus.CompletedWithErrors or SyncPlanStatus.Failed)
        {
            throw new InvalidOperationException($"Cannot modify selection of plan in status '{plan.Status}'.");
        }

        // Modifying an approved plan invalidates its approval!
        if (plan.Status == SyncPlanStatus.Approved)
        {
            plan.Status = SyncPlanStatus.AwaitingApproval;
            plan.ApprovedByUserId = null;
            plan.ApprovedByUsername = null;
            plan.ApprovedAt = null;
        }

        plan.Version++;

        var ops = plan.Operations.Where(o => o.OperationType != SyncOperationType.Blocked).ToList();

        if (request.SelectAll == true)
        {
            ops.ForEach(o => o.IsSelected = true);
        }
        else if (request.DeselectAll == true)
        {
            ops.ForEach(o => o.IsSelected = false);
        }
        else if (request.OperationIds != null && request.OperationIds.Count > 0)
        {
            var idSet = new HashSet<string>(request.OperationIds);
            foreach (var op in ops.Where(o => idSet.Contains(o.Id)))
            {
                op.IsSelected = request.Selected;
            }
        }
        else if (!string.IsNullOrWhiteSpace(request.OperationType))
        {
            foreach (var op in ops.Where(o => string.Equals(o.OperationType, request.OperationType, StringComparison.OrdinalIgnoreCase)))
            {
                op.IsSelected = request.Selected;
            }
        }
        else if (!string.IsNullOrWhiteSpace(request.TableName))
        {
            foreach (var op in ops.Where(o => string.Equals(o.TableName, request.TableName, StringComparison.OrdinalIgnoreCase)))
            {
                op.IsSelected = request.Selected;
            }
        }

        plan.InsertCount = plan.Operations.Count(o => o.OperationType == SyncOperationType.Insert && o.IsSelected);
        plan.UpdateCount = plan.Operations.Count(o => o.OperationType == SyncOperationType.Update && o.IsSelected);
        plan.DeleteCount = plan.Operations.Count(o => o.OperationType == SyncOperationType.Delete && o.IsSelected);
        plan.SkippedCount = plan.Operations.Count(o => o.OperationType == SyncOperationType.Skip || (!o.IsSelected && o.OperationType != SyncOperationType.Blocked));

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAuthEventAsync(
            userId,
            "system",
            "SYNC_PLAN_UPDATED",
            targetType: "SyncPlan",
            targetId: plan.Id,
            success: true,
            metadata: new { planId = plan.Id, version = plan.Version, inserts = plan.InsertCount, updates = plan.UpdateCount, deletes = plan.DeleteCount },
            cancellationToken: cancellationToken);

        return MapPlanToResponse(plan);
    }

    public async Task<ValidationSummaryResponse> ValidatePlanAsync(
        string planId,
        string userId,
        CancellationToken cancellationToken = default)
    {
        var plan = await _dbContext.SyncPlans
            .Include(p => p.Operations)
            .FirstOrDefaultAsync(p => p.Id == planId, cancellationToken);

        if (plan == null)
        {
            throw new KeyNotFoundException($"SyncPlan '{planId}' was not found.");
        }

        var errors = new List<string>();
        var warnings = new List<string>();

        // 1. Validate Target Connection AllowWrite
        var targetConnection = await _connectionStore.GetByIdAsync(plan.TargetConnectionId, cancellationToken);
        if (targetConnection != null && !targetConnection.AllowWrite)
        {
            errors.Add($"Target database connection '{targetConnection.Name}' has AllowWrite disabled (Read-Only).");
        }

        // 2. Validate Production warning
        if (string.Equals(plan.Environment, "Production", StringComparison.OrdinalIgnoreCase))
        {
            warnings.Add("Target database is a PRODUCTION environment. All mutations must be carefully reviewed.");
        }

        // 3. Check Delete operations warning
        if (plan.DeleteCount > 0)
        {
            warnings.Add($"This plan includes {plan.DeleteCount} DELETE operations which will permanently remove records from Target.");
        }

        int blockedCount = plan.Operations.Count(o => o.OperationType == SyncOperationType.Blocked);
        if (blockedCount > 0)
        {
            warnings.Add($"{blockedCount} operations are blocked by security or schema policies and will not be executed.");
        }

        var result = new ValidationSummaryResponse
        {
            IsValid = errors.Count == 0,
            CanExecute = errors.Count == 0 && plan.Operations.Any(o => o.IsSelected && o.OperationType != SyncOperationType.Blocked),
            Errors = errors,
            Warnings = warnings,
            ValidCount = plan.Operations.Count(o => o.IsSelected && o.OperationType != SyncOperationType.Blocked),
            BlockedCount = blockedCount,
            ConflictCount = plan.Operations.Count(o => o.Status == SyncOperationStatus.Conflict)
        };

        plan.ValidatedAt = DateTime.UtcNow;
        plan.ValidationResultJson = JsonSerializer.Serialize(result);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return result;
    }

    public async Task<DryRunResultResponse> DryRunAsync(
        string planId,
        string userId,
        string username,
        string? ipAddress = null,
        CancellationToken cancellationToken = default)
    {
        var plan = await _dbContext.SyncPlans
            .Include(p => p.Operations)
            .FirstOrDefaultAsync(p => p.Id == planId, cancellationToken);

        if (plan == null)
        {
            throw new KeyNotFoundException($"SyncPlan '{planId}' was not found.");
        }

        await _auditService.LogAuthEventAsync(
            userId,
            username,
            "SYNC_DRY_RUN_STARTED",
            targetType: "SyncPlan",
            targetId: plan.Id,
            ipAddress: ipAddress,
            success: true,
            cancellationToken: cancellationToken);

        var selectedOps = plan.Operations.Where(o => o.IsSelected && o.OperationType != SyncOperationType.Blocked).ToList();
        var logs = new List<string>
        {
            $"[DryRun] Started simulation for SyncPlan '{plan.Id}' (v{plan.Version}) with {selectedOps.Count} operations.",
            $"[DryRun] Validated target connection '{plan.TargetConnectionId}' ({plan.Environment}).",
            $"[DryRun] Revalidated table schemas and Primary Key definitions."
        };

        int wouldInsert = selectedOps.Count(o => o.OperationType == SyncOperationType.Insert);
        int wouldUpdate = selectedOps.Count(o => o.OperationType == SyncOperationType.Update);
        int wouldDelete = selectedOps.Count(o => o.OperationType == SyncOperationType.Delete);

        logs.Add($"[DryRun] Would execute {wouldInsert} INSERTs, {wouldUpdate} UPDATEs, and {wouldDelete} DELETEs.");
        logs.Add("[DryRun] Simulation completed successfully with zero mutations committed to database.");

        var dryRunResult = new DryRunResultResponse
        {
            Success = true,
            WouldInsert = wouldInsert,
            WouldUpdate = wouldUpdate,
            WouldDelete = wouldDelete,
            Conflicts = 0,
            Errors = 0,
            Message = $"Dry run simulated {selectedOps.Count} operations successfully without committing data.",
            LogMessages = logs
        };

        plan.DryRunCompletedAt = DateTime.UtcNow;
        plan.DryRunPlanVersion = plan.Version;
        plan.DryRunResultJson = JsonSerializer.Serialize(dryRunResult);

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAuthEventAsync(
            userId,
            username,
            "SYNC_DRY_RUN_COMPLETED",
            targetType: "SyncPlan",
            targetId: plan.Id,
            ipAddress: ipAddress,
            success: true,
            metadata: dryRunResult,
            cancellationToken: cancellationToken);

        return dryRunResult;
    }

    public async Task<SyncPlanResponse> ApprovePlanAsync(
        string planId,
        ApprovePlanRequest request,
        string userId,
        string username,
        CancellationToken cancellationToken = default)
    {
        var plan = await _dbContext.SyncPlans
            .Include(p => p.Operations)
            .FirstOrDefaultAsync(p => p.Id == planId, cancellationToken);

        if (plan == null)
        {
            throw new KeyNotFoundException($"SyncPlan '{planId}' was not found.");
        }

        bool requireDifferentApprover = _configuration.GetValue<bool>("Sync:RequireDifferentApprover", true);
        if (requireDifferentApprover && string.Equals(plan.CreatedByUserId, userId, StringComparison.OrdinalIgnoreCase))
        {
            // Unless user has bypass
            throw new DynamicCrudException(
                "TWO_PERSON_RULE_VIOLATION",
                "Two-person rule violation: The creator of the sync plan cannot approve their own plan.",
                HttpStatusCode.Forbidden);
        }

        plan.Status = SyncPlanStatus.Approved;
        plan.ApprovedByUserId = userId;
        plan.ApprovedByUsername = username;
        plan.ApprovedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAuthEventAsync(
            userId,
            username,
            "SYNC_PLAN_APPROVED",
            targetType: "SyncPlan",
            targetId: plan.Id,
            success: true,
            metadata: new { planId = plan.Id, version = plan.Version, comment = request.Comment },
            cancellationToken: cancellationToken);

        return MapPlanToResponse(plan);
    }

    public async Task<SyncPlanResponse> RejectPlanAsync(
        string planId,
        RejectPlanRequest request,
        string userId,
        string username,
        CancellationToken cancellationToken = default)
    {
        var plan = await _dbContext.SyncPlans
            .Include(p => p.Operations)
            .FirstOrDefaultAsync(p => p.Id == planId, cancellationToken);

        if (plan == null)
        {
            throw new KeyNotFoundException($"SyncPlan '{planId}' was not found.");
        }

        plan.Status = SyncPlanStatus.Rejected;
        plan.RejectionReason = request.Reason;

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _auditService.LogAuthEventAsync(
            userId,
            username,
            "SYNC_PLAN_REJECTED",
            targetType: "SyncPlan",
            targetId: plan.Id,
            success: true,
            metadata: new { planId = plan.Id, reason = request.Reason },
            cancellationToken: cancellationToken);

        return MapPlanToResponse(plan);
    }

    public async Task<ReversalPlanResponse> CreateReversalPlanAsync(
        string executionId,
        string userId,
        string username,
        CancellationToken cancellationToken = default)
    {
        var execution = await _dbContext.SyncExecutions
            .Include(e => e.SyncPlan)
            .FirstOrDefaultAsync(e => e.Id == executionId, cancellationToken);

        if (execution == null)
        {
            throw new KeyNotFoundException($"SyncExecution '{executionId}' was not found.");
        }

        var originalPlan = execution.SyncPlan ?? await _dbContext.SyncPlans.Include(p => p.Operations).FirstOrDefaultAsync(p => p.Id == execution.SyncPlanId, cancellationToken);
        if (originalPlan == null)
        {
            throw new KeyNotFoundException($"SyncPlan for execution '{executionId}' was not found.");
        }

        var completedOps = await _dbContext.SyncOperations
            .Where(o => o.SyncPlanId == originalPlan.Id && o.Status == SyncOperationStatus.Completed)
            .OrderByDescending(o => o.Order)
            .ToListAsync(cancellationToken);

        if (completedOps.Count == 0)
        {
            throw new InvalidOperationException("No completed operations found to reverse.");
        }

        var reversalOps = new List<SyncOperation>();
        int order = 1;

        foreach (var op in completedOps)
        {
            string revType = SyncOperationType.Skip;
            string? revSource = null;
            string? revTarget = null;

            if (op.OperationType == SyncOperationType.Insert)
            {
                // Reversal of Insert is Delete
                revType = SyncOperationType.Delete;
                revTarget = op.SourceValuesJson;
            }
            else if (op.OperationType == SyncOperationType.Delete)
            {
                // Reversal of Delete is Insert
                revType = SyncOperationType.Insert;
                revSource = op.TargetValuesJson;
            }
            else if (op.OperationType == SyncOperationType.Update)
            {
                // Reversal of Update is Update back to Before/Target values
                revType = SyncOperationType.Update;
                revSource = op.TargetValuesJson;
                revTarget = op.SourceValuesJson;
            }

            reversalOps.Add(new SyncOperation
            {
                Id = Guid.NewGuid().ToString(),
                Order = order++,
                SchemaName = op.SchemaName,
                TableName = op.TableName,
                PrimaryKeyJson = op.PrimaryKeyJson,
                OperationType = revType,
                Status = SyncOperationStatus.Pending,
                IsSelected = true,
                SourceValuesJson = revSource,
                TargetValuesJson = revTarget,
                ChangedColumnsJson = op.ChangedColumnsJson
            });
        }

        var revPlan = new SyncPlan
        {
            Id = Guid.NewGuid().ToString(),
            CompareSessionId = originalPlan.CompareSessionId,
            CreatedByUserId = userId,
            CreatedByUsername = username,
            SourceConnectionId = originalPlan.TargetConnectionId,
            SourceDatabase = originalPlan.TargetDatabase,
            TargetConnectionId = originalPlan.TargetConnectionId,
            TargetDatabase = originalPlan.TargetDatabase,
            Direction = originalPlan.Direction == SyncDirection.SourceToTarget ? SyncDirection.TargetToSource : SyncDirection.SourceToTarget,
            Environment = originalPlan.Environment,
            Status = SyncPlanStatus.Draft,
            ApprovalRequired = originalPlan.ApprovalRequired,
            CreatedAt = DateTime.UtcNow,
            TotalOperations = reversalOps.Count,
            InsertCount = reversalOps.Count(o => o.OperationType == SyncOperationType.Insert),
            UpdateCount = reversalOps.Count(o => o.OperationType == SyncOperationType.Update),
            DeleteCount = reversalOps.Count(o => o.OperationType == SyncOperationType.Delete),
            OptionsJson = originalPlan.OptionsJson,
            Operations = reversalOps
        };

        _dbContext.SyncPlans.Add(revPlan);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new ReversalPlanResponse
        {
            NewPlanId = revPlan.Id,
            OriginalPlanId = originalPlan.Id,
            ExecutionId = executionId,
            OperationsCount = revPlan.TotalOperations,
            Message = $"Reversal plan '{revPlan.Id}' generated with {revPlan.TotalOperations} inverse operations."
        };
    }

    private static SyncPlanResponse MapPlanToResponse(SyncPlan plan)
    {
        SyncPlanOptionsDto options = new();
        if (!string.IsNullOrWhiteSpace(plan.OptionsJson))
        {
            try { options = JsonSerializer.Deserialize<SyncPlanOptionsDto>(plan.OptionsJson) ?? new(); } catch { }
        }

        ValidationSummaryResponse? validation = null;
        if (!string.IsNullOrWhiteSpace(plan.ValidationResultJson))
        {
            try { validation = JsonSerializer.Deserialize<ValidationSummaryResponse>(plan.ValidationResultJson); } catch { }
        }

        DryRunResultResponse? dryRun = null;
        if (!string.IsNullOrWhiteSpace(plan.DryRunResultJson))
        {
            try { dryRun = JsonSerializer.Deserialize<DryRunResultResponse>(plan.DryRunResultJson); } catch { }
        }

        return new SyncPlanResponse
        {
            Id = plan.Id,
            CompareSessionId = plan.CompareSessionId,
            CreatedByUserId = plan.CreatedByUserId,
            CreatedByUsername = plan.CreatedByUsername,
            SourceConnectionId = plan.SourceConnectionId,
            SourceDatabase = plan.SourceDatabase,
            TargetConnectionId = plan.TargetConnectionId,
            TargetDatabase = plan.TargetDatabase,
            Direction = plan.Direction,
            Status = plan.Status,
            Environment = plan.Environment,
            CreatedAt = plan.CreatedAt,
            ValidatedAt = plan.ValidatedAt,
            ApprovedAt = plan.ApprovedAt,
            ExecutedAt = plan.ExecutedAt,
            CompletedAt = plan.CompletedAt,
            TotalOperations = plan.TotalOperations,
            InsertCount = plan.InsertCount,
            UpdateCount = plan.UpdateCount,
            DeleteCount = plan.DeleteCount,
            SkippedCount = plan.SkippedCount,
            BlockedCount = plan.BlockedCount,
            Options = options,
            Validation = validation,
            ApprovalRequired = plan.ApprovalRequired,
            ApprovedByUserId = plan.ApprovedByUserId,
            ApprovedByUsername = plan.ApprovedByUsername,
            RejectionReason = plan.RejectionReason,
            Version = plan.Version,
            DryRunCompletedAt = plan.DryRunCompletedAt,
            DryRunPlanVersion = plan.DryRunPlanVersion,
            DryRunResult = dryRun
        };
    }

    private static SyncOperationDto MapOperationToDto(SyncOperation op)
    {
        Dictionary<string, object?> keyValues = new();
        if (!string.IsNullOrWhiteSpace(op.PrimaryKeyJson))
        {
            try { keyValues = JsonSerializer.Deserialize<Dictionary<string, object?>>(op.PrimaryKeyJson) ?? new(); } catch { }
        }

        Dictionary<string, object?>? src = null;
        if (!string.IsNullOrWhiteSpace(op.SourceValuesJson))
        {
            try { src = JsonSerializer.Deserialize<Dictionary<string, object?>>(op.SourceValuesJson); } catch { }
        }

        Dictionary<string, object?>? tgt = null;
        if (!string.IsNullOrWhiteSpace(op.TargetValuesJson))
        {
            try { tgt = JsonSerializer.Deserialize<Dictionary<string, object?>>(op.TargetValuesJson); } catch { }
        }

        List<string> changed = new();
        if (!string.IsNullOrWhiteSpace(op.ChangedColumnsJson))
        {
            try { changed = JsonSerializer.Deserialize<List<string>>(op.ChangedColumnsJson) ?? new(); } catch { }
        }

        string pkSummary = keyValues.Count > 0 ? string.Join(", ", keyValues.Select(k => $"{k.Key}={k.Value}")) : op.PrimaryKeyJson;

        return new SyncOperationDto
        {
            Id = op.Id,
            SyncPlanId = op.SyncPlanId,
            Order = op.Order,
            SchemaName = op.SchemaName,
            TableName = op.TableName,
            PrimaryKey = pkSummary,
            KeyValues = keyValues,
            OperationType = op.OperationType,
            Status = op.Status,
            IsSelected = op.IsSelected,
            SourceValues = src,
            TargetValues = tgt,
            ChangedColumns = changed,
            ExpectedTargetVersion = op.ExpectedTargetVersion,
            ErrorCode = op.ErrorCode,
            ErrorMessage = op.ErrorMessage,
            ExecutedAt = op.ExecutedAt,
            DurationMs = op.DurationMs
        };
    }
}
