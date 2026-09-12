namespace DBHub.Api.Services.Sync;

public class DependencySortResult
{
    public List<string> OrderedTables { get; set; } = new();
    public bool HasCycle { get; set; }
    public List<string> CycleTables { get; set; } = new();
    public string? WarningMessage { get; set; }
}

public interface ISyncDependencyResolver
{
    /// <summary>
    /// Computes table execution order for INSERT operations (Parent tables before Child tables).
    /// </summary>
    DependencySortResult ResolveInsertOrder(
        IEnumerable<string> tableNames,
        IEnumerable<(string ParentTable, string ChildTable)> foreignKeys);

    /// <summary>
    /// Computes table execution order for DELETE operations (Child tables before Parent tables).
    /// </summary>
    DependencySortResult ResolveDeleteOrder(
        IEnumerable<string> tableNames,
        IEnumerable<(string ParentTable, string ChildTable)> foreignKeys);
}
