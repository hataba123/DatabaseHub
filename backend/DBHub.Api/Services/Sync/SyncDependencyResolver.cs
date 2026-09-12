namespace DBHub.Api.Services.Sync;

public class SyncDependencyResolver : ISyncDependencyResolver
{
    public DependencySortResult ResolveInsertOrder(
        IEnumerable<string> tableNames,
        IEnumerable<(string ParentTable, string ChildTable)> foreignKeys)
    {
        var tables = new HashSet<string>(tableNames, StringComparer.OrdinalIgnoreCase);
        // Directed edge: Parent -> Child (Parent must be inserted before Child)
        var adj = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);
        var inDegree = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        foreach (var t in tables)
        {
            adj[t] = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            inDegree[t] = 0;
        }

        foreach (var (parent, child) in foreignKeys)
        {
            if (tables.Contains(parent) && tables.Contains(child) && !string.Equals(parent, child, StringComparison.OrdinalIgnoreCase))
            {
                if (adj[parent].Add(child))
                {
                    inDegree[child]++;
                }
            }
        }

        var queue = new Queue<string>(inDegree.Where(kv => kv.Value == 0).Select(kv => kv.Key));
        var ordered = new List<string>();

        while (queue.Count > 0)
        {
            var curr = queue.Dequeue();
            ordered.Add(curr);

            foreach (var neighbor in adj[curr])
            {
                inDegree[neighbor]--;
                if (inDegree[neighbor] == 0)
                {
                    queue.Enqueue(neighbor);
                }
            }
        }

        if (ordered.Count < tables.Count)
        {
            var remaining = tables.Except(ordered, StringComparer.OrdinalIgnoreCase).ToList();
            return new DependencySortResult
            {
                OrderedTables = ordered.Concat(remaining).ToList(),
                HasCycle = true,
                CycleTables = remaining,
                WarningMessage = $"Circular foreign key dependencies detected between tables: {string.Join(", ", remaining)}. Manual dependency review required."
            };
        }

        return new DependencySortResult
        {
            OrderedTables = ordered,
            HasCycle = false
        };
    }

    public DependencySortResult ResolveDeleteOrder(
        IEnumerable<string> tableNames,
        IEnumerable<(string ParentTable, string ChildTable)> foreignKeys)
    {
        var tables = new HashSet<string>(tableNames, StringComparer.OrdinalIgnoreCase);
        // Directed edge: Child -> Parent (Child must be deleted before Parent)
        var adj = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);
        var inDegree = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        foreach (var t in tables)
        {
            adj[t] = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            inDegree[t] = 0;
        }

        foreach (var (parent, child) in foreignKeys)
        {
            if (tables.Contains(parent) && tables.Contains(child) && !string.Equals(parent, child, StringComparison.OrdinalIgnoreCase))
            {
                if (adj[child].Add(parent))
                {
                    inDegree[parent]++;
                }
            }
        }

        var queue = new Queue<string>(inDegree.Where(kv => kv.Value == 0).Select(kv => kv.Key));
        var ordered = new List<string>();

        while (queue.Count > 0)
        {
            var curr = queue.Dequeue();
            ordered.Add(curr);

            foreach (var neighbor in adj[curr])
            {
                inDegree[neighbor]--;
                if (inDegree[neighbor] == 0)
                {
                    queue.Enqueue(neighbor);
                }
            }
        }

        if (ordered.Count < tables.Count)
        {
            var remaining = tables.Except(ordered, StringComparer.OrdinalIgnoreCase).ToList();
            return new DependencySortResult
            {
                OrderedTables = ordered.Concat(remaining).ToList(),
                HasCycle = true,
                CycleTables = remaining,
                WarningMessage = $"Circular foreign key dependencies detected between tables: {string.Join(", ", remaining)}. Manual dependency review required."
            };
        }

        return new DependencySortResult
        {
            OrderedTables = ordered,
            HasCycle = false
        };
    }
}
