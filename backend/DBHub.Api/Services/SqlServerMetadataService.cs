using Dapper;
using DBHub.Api.Models;
using Microsoft.Extensions.Caching.Memory;

namespace DBHub.Api.Services;

public class SqlServerMetadataService : ISqlServerMetadataService
{
    private readonly ISqlConnectionFactory _connectionFactory;
    private readonly IMemoryCache _cache;
    private readonly ILogger<SqlServerMetadataService> _logger;

    public SqlServerMetadataService(
        ISqlConnectionFactory connectionFactory,
        IMemoryCache cache,
        ILogger<SqlServerMetadataService> logger)
    {
        _connectionFactory = connectionFactory;
        _cache = cache;
        _logger = logger;
    }

    public async Task<IReadOnlyList<DatabaseItem>> GetDatabasesAsync(
        DatabaseConnection connection,
        CancellationToken cancellationToken = default)
    {
        var cacheKey = $"meta:dbs:{connection.Id}";
        if (_cache.TryGetValue<IReadOnlyList<DatabaseItem>>(cacheKey, out var cached) && cached != null)
        {
            return cached;
        }

        const string sql = @"
SELECT 
    d.name AS Name,
    d.state_desc AS State,
    d.create_date AS CreatedAt,
    CAST(SUM(mf.size) * 8.0 / 1024 AS DECIMAL(18, 2)) AS SizeMb
FROM sys.databases d
LEFT JOIN sys.master_files mf ON d.database_id = mf.database_id
WHERE d.name NOT IN ('master', 'tempdb', 'model', 'msdb')
GROUP BY d.name, d.state_desc, d.create_date
ORDER BY d.name;";

        await using var conn = _connectionFactory.CreateConnection(connection, "master");
        await conn.OpenAsync(cancellationToken);

        var cmd = new CommandDefinition(sql, commandTimeout: 15, cancellationToken: cancellationToken);
        var result = (await conn.QueryAsync<DatabaseItem>(cmd)).ToList();

        _cache.Set(cacheKey, result, TimeSpan.FromMinutes(2));
        return result;
    }

    public async Task<IReadOnlyList<TableItem>> GetTablesAsync(
        DatabaseConnection connection,
        string database,
        string? search = null,
        CancellationToken cancellationToken = default)
    {
        var cacheKey = $"meta:tbls:{connection.Id}:{database}:{search ?? "*"}";
        if (_cache.TryGetValue<IReadOnlyList<TableItem>>(cacheKey, out var cached) && cached != null)
        {
            return cached;
        }

        const string sql = @"
SELECT 
    s.name AS [Schema],
    t.name AS Name,
    ISNULL(p.RowCount, 0) AS RowCount
FROM sys.tables t
INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
LEFT JOIN (
    SELECT 
        object_id, 
        SUM(rows) AS RowCount
    FROM sys.partitions
    WHERE index_id IN (0, 1)
    GROUP BY object_id
) p ON t.object_id = p.object_id
WHERE t.is_ms_shipped = 0
  AND (@Search IS NULL OR t.name LIKE '%' + @Search + '%')
ORDER BY s.name, t.name;";

        await using var conn = _connectionFactory.CreateConnection(connection, database);
        await conn.OpenAsync(cancellationToken);

        var cmd = new CommandDefinition(
            sql,
            new { Search = string.IsNullOrWhiteSpace(search) ? null : search.Trim() },
            commandTimeout: 20,
            cancellationToken: cancellationToken);

        var result = (await conn.QueryAsync<TableItem>(cmd)).ToList();
        _cache.Set(cacheKey, result, TimeSpan.FromMinutes(2));
        return result;
    }

    public async Task<IReadOnlyList<ViewItem>> GetViewsAsync(
        DatabaseConnection connection,
        string database,
        CancellationToken cancellationToken = default)
    {
        var cacheKey = $"meta:views:{connection.Id}:{database}";
        if (_cache.TryGetValue<IReadOnlyList<ViewItem>>(cacheKey, out var cached) && cached != null)
        {
            return cached;
        }

        const string sql = @"
SELECT 
    s.name AS [Schema],
    v.name AS Name
FROM sys.views v
INNER JOIN sys.schemas s ON v.schema_id = s.schema_id
WHERE v.is_ms_shipped = 0
ORDER BY s.name, v.name;";

        await using var conn = _connectionFactory.CreateConnection(connection, database);
        await conn.OpenAsync(cancellationToken);

        var cmd = new CommandDefinition(sql, commandTimeout: 20, cancellationToken: cancellationToken);
        var result = (await conn.QueryAsync<ViewItem>(cmd)).ToList();
        _cache.Set(cacheKey, result, TimeSpan.FromMinutes(2));
        return result;
    }

    public async Task<IReadOnlyList<ProcedureItem>> GetStoredProceduresAsync(
        DatabaseConnection connection,
        string database,
        CancellationToken cancellationToken = default)
    {
        var cacheKey = $"meta:procs:{connection.Id}:{database}";
        if (_cache.TryGetValue<IReadOnlyList<ProcedureItem>>(cacheKey, out var cached) && cached != null)
        {
            return cached;
        }

        const string sql = @"
SELECT 
    s.name AS [Schema],
    p.name AS Name
FROM sys.procedures p
INNER JOIN sys.schemas s ON p.schema_id = s.schema_id
WHERE p.is_ms_shipped = 0
ORDER BY s.name, p.name;";

        await using var conn = _connectionFactory.CreateConnection(connection, database);
        await conn.OpenAsync(cancellationToken);

        var cmd = new CommandDefinition(sql, commandTimeout: 20, cancellationToken: cancellationToken);
        var result = (await conn.QueryAsync<ProcedureItem>(cmd)).ToList();
        _cache.Set(cacheKey, result, TimeSpan.FromMinutes(2));
        return result;
    }

    public async Task<IReadOnlyList<ColumnItem>> GetColumnsAsync(
        DatabaseConnection connection,
        string database,
        string schema,
        string table,
        CancellationToken cancellationToken = default)
    {
        var cacheKey = $"meta:cols:{connection.Id}:{database}:{schema}:{table}";
        if (_cache.TryGetValue<IReadOnlyList<ColumnItem>>(cacheKey, out var cached) && cached != null)
        {
            return cached;
        }

        const string sql = @"
SELECT 
    c.name AS Name,
    tp.name AS DataType,
    CASE 
        WHEN tp.name IN ('nchar', 'nvarchar') AND c.max_length > 0 THEN c.max_length / 2
        ELSE c.max_length 
    END AS MaxLength,
    CAST(c.precision AS INT) AS [Precision],
    CAST(c.scale AS INT) AS [Scale],
    c.is_nullable AS Nullable,
    ISNULL(pk.is_pk, 0) AS IsPrimaryKey,
    c.is_identity AS IsIdentity,
    c.is_computed AS IsComputed,
    CASE WHEN tp.name IN ('rowversion', 'timestamp') THEN 1 ELSE 0 END AS IsRowVersion,
    CASE WHEN c.default_object_id > 0 THEN 1 ELSE 0 END AS HasDefault,
    dc.definition AS DefaultValue
FROM sys.columns c
INNER JOIN sys.tables t ON c.object_id = t.object_id
INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
INNER JOIN sys.types tp ON c.user_type_id = tp.user_type_id
LEFT JOIN sys.default_constraints dc ON c.default_object_id = dc.object_id
LEFT JOIN (
    SELECT ic.object_id, ic.column_id, 1 AS is_pk
    FROM sys.index_columns ic
    INNER JOIN sys.indexes i ON ic.object_id = i.object_id AND ic.index_id = i.index_id
    WHERE i.is_primary_key = 1
) pk ON c.object_id = pk.object_id AND c.column_id = pk.column_id
WHERE s.name = @Schema AND t.name = @Table
ORDER BY c.column_id;";

        await using var conn = _connectionFactory.CreateConnection(connection, database);
        await conn.OpenAsync(cancellationToken);

        var cmd = new CommandDefinition(
            sql,
            new { Schema = schema, Table = table },
            commandTimeout: 20,
            cancellationToken: cancellationToken);

        var result = (await conn.QueryAsync<ColumnItem>(cmd)).ToList();
        _cache.Set(cacheKey, result, TimeSpan.FromMinutes(3));
        return result;
    }

    public async Task<IReadOnlyList<IndexItem>> GetIndexesAsync(
        DatabaseConnection connection,
        string database,
        string schema,
        string table,
        CancellationToken cancellationToken = default)
    {
        var cacheKey = $"meta:idx:{connection.Id}:{database}:{schema}:{table}";
        if (_cache.TryGetValue<IReadOnlyList<IndexItem>>(cacheKey, out var cached) && cached != null)
        {
            return cached;
        }

        const string sql = @"
SELECT 
    i.name AS Name,
    i.type_desc AS [Type],
    i.is_unique AS [Unique],
    i.is_primary_key AS PrimaryKey,
    c.name AS ColumnName,
    ic.key_ordinal AS KeyOrdinal
FROM sys.indexes i
INNER JOIN sys.tables t ON i.object_id = t.object_id
INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
WHERE s.name = @Schema AND t.name = @Table AND i.name IS NOT NULL
ORDER BY i.name, ic.key_ordinal;";

        await using var conn = _connectionFactory.CreateConnection(connection, database);
        await conn.OpenAsync(cancellationToken);

        var cmd = new CommandDefinition(
            sql,
            new { Schema = schema, Table = table },
            commandTimeout: 20,
            cancellationToken: cancellationToken);

        var rawRows = await conn.QueryAsync(cmd);

        var groupDict = new Dictionary<string, IndexItem>(StringComparer.OrdinalIgnoreCase);
        foreach (var r in rawRows)
        {
            string idxName = r.Name;
            if (!groupDict.TryGetValue(idxName, out var item))
            {
                item = new IndexItem
                {
                    Name = idxName,
                    Type = r.Type,
                    Unique = r.Unique,
                    PrimaryKey = r.PrimaryKey,
                    Columns = new List<string>()
                };
                groupDict[idxName] = item;
            }
            item.Columns.Add((string)r.ColumnName);
        }

        var result = groupDict.Values.ToList();
        _cache.Set(cacheKey, result, TimeSpan.FromMinutes(3));
        return result;
    }

    public async Task<IReadOnlyList<RelationshipItem>> GetRelationshipsAsync(
        DatabaseConnection connection,
        string database,
        string schema,
        string table,
        CancellationToken cancellationToken = default)
    {
        var cacheKey = $"meta:fks:{connection.Id}:{database}:{schema}:{table}";
        if (_cache.TryGetValue<IReadOnlyList<RelationshipItem>>(cacheKey, out var cached) && cached != null)
        {
            return cached;
        }

        const string sql = @"
SELECT 
    fk.name AS Name,
    c_parent.name AS [Column],
    s_ref.name AS ReferencedSchema,
    t_ref.name AS ReferencedTable,
    c_ref.name AS ReferencedColumn
FROM sys.foreign_keys fk
INNER JOIN sys.tables t_parent ON fk.parent_object_id = t_parent.object_id
INNER JOIN sys.schemas s_parent ON t_parent.schema_id = s_parent.schema_id
INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
INNER JOIN sys.columns c_parent ON fkc.parent_object_id = c_parent.object_id AND fkc.parent_column_id = c_parent.column_id
INNER JOIN sys.tables t_ref ON fkc.referenced_object_id = t_ref.object_id
INNER JOIN sys.schemas s_ref ON t_ref.schema_id = s_ref.schema_id
INNER JOIN sys.columns c_ref ON fkc.referenced_object_id = c_ref.object_id AND fkc.referenced_column_id = c_ref.column_id
WHERE s_parent.name = @Schema AND t_parent.name = @Table
ORDER BY fk.name;";

        await using var conn = _connectionFactory.CreateConnection(connection, database);
        await conn.OpenAsync(cancellationToken);

        var cmd = new CommandDefinition(
            sql,
            new { Schema = schema, Table = table },
            commandTimeout: 20,
            cancellationToken: cancellationToken);

        var result = (await conn.QueryAsync<RelationshipItem>(cmd)).ToList();
        _cache.Set(cacheKey, result, TimeSpan.FromMinutes(3));
        return result;
    }
}
