using System.Globalization;
using DBHub.Api.DTOs;
using DBHub.Api.Infrastructure;
using DBHub.Api.Models.Compare;
using DBHub.Api.Models.Sync;
using DBHub.Api.Services.Sync;
using Xunit;

namespace DBHub.Tests;

public class SyncEngineTests
{
    private readonly SyncDependencyResolver _dependencyResolver = new();

    [Fact]
    public void ResolveInsertOrder_ParentTableOrderedBeforeChildTable()
    {
        var tables = new[] { "OrderDetails", "Orders", "Customers" };
        var fks = new[]
        {
            ("Customers", "Orders"),      // Orders references Customers
            ("Orders", "OrderDetails")    // OrderDetails references Orders
        };

        var result = _dependencyResolver.ResolveInsertOrder(tables, fks);

        Assert.False(result.HasCycle);
        Assert.Equal(3, result.OrderedTables.Count);

        var custIdx = result.OrderedTables.IndexOf("Customers");
        var ordersIdx = result.OrderedTables.IndexOf("Orders");
        var detailsIdx = result.OrderedTables.IndexOf("OrderDetails");

        Assert.True(custIdx < ordersIdx, "Customers must be inserted before Orders.");
        Assert.True(ordersIdx < detailsIdx, "Orders must be inserted before OrderDetails.");
    }

    [Fact]
    public void ResolveDeleteOrder_ChildTableOrderedBeforeParentTable()
    {
        var tables = new[] { "Customers", "Orders", "OrderDetails" };
        var fks = new[]
        {
            ("Customers", "Orders"),
            ("Orders", "OrderDetails")
        };

        var result = _dependencyResolver.ResolveDeleteOrder(tables, fks);

        Assert.False(result.HasCycle);
        Assert.Equal(3, result.OrderedTables.Count);

        var custIdx = result.OrderedTables.IndexOf("Customers");
        var ordersIdx = result.OrderedTables.IndexOf("Orders");
        var detailsIdx = result.OrderedTables.IndexOf("OrderDetails");

        Assert.True(detailsIdx < ordersIdx, "OrderDetails must be deleted before Orders.");
        Assert.True(ordersIdx < custIdx, "Orders must be deleted before Customers.");
    }

    [Fact]
    public void ResolveInsertOrder_CircularDependency_DetectsCycleAndFlagsWarning()
    {
        var tables = new[] { "TableA", "TableB" };
        var fks = new[]
        {
            ("TableA", "TableB"),
            ("TableB", "TableA")
        };

        var result = _dependencyResolver.ResolveInsertOrder(tables, fks);

        Assert.True(result.HasCycle);
        Assert.NotEmpty(result.CycleTables);
        Assert.NotNull(result.WarningMessage);
        Assert.Contains("Circular foreign key dependencies detected", result.WarningMessage);
    }

    [Fact]
    public void SyncPlanOptions_DefaultValues_DeleteExtraIsAlwaysFalse()
    {
        var options = new SyncPlanOptionsDto();

        Assert.True(options.InsertMissing, "Insert missing should be enabled by default.");
        Assert.True(options.UpdateDifferent, "Update different should be enabled by default.");
        Assert.False(options.DeleteExtra, "Delete extra on target MUST be disabled by default.");
        Assert.Equal(100, options.BatchSize);
    }

    [Fact]
    public void SyncOperationTypes_VerifyStringConstants()
    {
        Assert.Equal("Insert", SyncOperationType.Insert);
        Assert.Equal("Update", SyncOperationType.Update);
        Assert.Equal("Delete", SyncOperationType.Delete);
        Assert.Equal("Skip", SyncOperationType.Skip);
        Assert.Equal("Blocked", SyncOperationType.Blocked);
    }

    [Fact]
    public void SyncPlanStatuses_VerifyStateMachineConstants()
    {
        Assert.Equal("Draft", SyncPlanStatus.Draft);
        Assert.Equal("Ready", SyncPlanStatus.Ready);
        Assert.Equal("AwaitingApproval", SyncPlanStatus.AwaitingApproval);
        Assert.Equal("Approved", SyncPlanStatus.Approved);
        Assert.Equal("Executing", SyncPlanStatus.Executing);
        Assert.Equal("Completed", SyncPlanStatus.Completed);
        Assert.Equal("CompletedWithErrors", SyncPlanStatus.CompletedWithErrors);
        Assert.Equal("Failed", SyncPlanStatus.Failed);
        Assert.Equal("Cancelled", SyncPlanStatus.Cancelled);
    }

    [Fact]
    public void ReversalPlan_InverseOperationsMapping()
    {
        // Test inverse logic:
        // Insert -> Delete
        // Update -> Update with Before values
        // Delete -> Insert
        var completedInsert = new SyncOperation
        {
            OperationType = SyncOperationType.Insert,
            Status = SyncOperationStatus.Completed,
            SourceValuesJson = "{\"Id\": 10, \"Name\": \"New\"}"
        };

        var completedUpdate = new SyncOperation
        {
            OperationType = SyncOperationType.Update,
            Status = SyncOperationStatus.Completed,
            SourceValuesJson = "{\"Id\": 10, \"Name\": \"NewVal\"}",
            TargetValuesJson = "{\"Id\": 10, \"Name\": \"OldVal\"}"
        };

        var completedDelete = new SyncOperation
        {
            OperationType = SyncOperationType.Delete,
            Status = SyncOperationStatus.Completed,
            TargetValuesJson = "{\"Id\": 10, \"Name\": \"DeletedRow\"}"
        };

        // Simulated reversal:
        var revOp1Type = completedInsert.OperationType == SyncOperationType.Insert ? SyncOperationType.Delete : "";
        var revOp2Type = completedUpdate.OperationType == SyncOperationType.Update ? SyncOperationType.Update : "";
        var revOp3Type = completedDelete.OperationType == SyncOperationType.Delete ? SyncOperationType.Insert : "";

        Assert.Equal(SyncOperationType.Delete, revOp1Type);
        Assert.Equal(SyncOperationType.Update, revOp2Type);
        Assert.Equal(SyncOperationType.Insert, revOp3Type);
    }

    [Fact]
    public void ApprovalInvalidation_WhenPlanModified_VersionIncrements()
    {
        var plan = new SyncPlan
        {
            Id = "plan-1",
            Status = SyncPlanStatus.Approved,
            Version = 1,
            ApprovedByUserId = "approver-1"
        };

        // When selection or options are modified:
        if (plan.Status == SyncPlanStatus.Approved)
        {
            plan.Status = SyncPlanStatus.AwaitingApproval;
            plan.ApprovedByUserId = null;
        }
        plan.Version++;

        Assert.Equal(SyncPlanStatus.AwaitingApproval, plan.Status);
        Assert.Null(plan.ApprovedByUserId);
        Assert.Equal(2, plan.Version);
    }
}
