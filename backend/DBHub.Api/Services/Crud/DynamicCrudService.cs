using System.Data.Common;
using System.Net;
using System.Text.Json;
using Dapper;
using DBHub.Api.DTOs;
using DBHub.Api.Infrastructure;
using DBHub.Api.Models;
using DBHub.Api.Models.Auth;
using DBHub.Api.Services.Auth;

namespace DBHub.Api.Services.Crud;

public class DynamicCrudService : IDynamicCrudService
{
    private readonly ISqlConnectionFactory _connectionFactory;
    private readonly ISqlServerMetadataService _metadataService;
    private readonly ISqlValueConverter _valueConverter;
    private readonly IDynamicCrudSqlBuilder _sqlBuilder;
    private readonly IAuditService _auditService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<DynamicCrudService> _logger;

    public DynamicCrudService(
        ISqlConnectionFactory connectionFactory,
        ISqlServerMetadataService metadataService,
        ISqlValueConverter valueConverter,
        IDynamicCrudSqlBuilder sqlBuilder,
        IAuditService auditService,
        IConfiguration configuration,
        ILogger<DynamicCrudService> logger)
    {
        _connectionFactory = connectionFactory;
        _metadataService = metadataService;
        _valueConverter = valueConverter;
        _sqlBuilder = sqlBuilder;
        _auditService = auditService;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<TableCapabilitiesResponse> GetCapabilitiesAsync(
        DatabaseConnection connection,
        string database,
        string schema,
        string table,
        CancellationToken cancellationToken = default)
    {
        var columns = await _metadataService.GetColumnsAsync(connection, database, schema, table, cancellationToken);
        var pkCols = columns.Where(c => c.IsPrimaryKey).Select(c => c.Name).ToList();
        var rvCol = columns.FirstOrDefault(c => c.IsRowVersion);

        bool isProtected = IsTableProtected(table);
        bool isWritable = connection.AllowWrite && !isProtected && pkCols.Count > 0;

        string? reason = null;
        if (!connection.AllowWrite)
        {
            reason = "Database connection is configured as Read-Only.";
        }
        else if (isProtected)
        {
            reason = $"Table '{table}' is protected by system security policies.";
        }
        else if (pkCols.Count == 0)
        {
            reason = "Table does not have a Primary Key defined.";
        }

        return new TableCapabilitiesResponse
        {
            CanInsert = isWritable,
            CanUpdate = isWritable,
            CanDelete = isWritable,
            IsWritable = isWritable,
            PrimaryKeys = pkCols,
            HasRowVersion = rvCol != null,
            RowVersionColumn = rvCol?.Name,
            Reason = reason
        };
    }

    public async Task<IDictionary<string, object?>?> GetRowByKeyAsync(
        DatabaseConnection connection,
        string database,
        string schema,
        string table,
        IDictionary<string, object?> keys,
        CancellationToken cancellationToken = default)
    {
        var columns = await _metadataService.GetColumnsAsync(connection, database, schema, table, cancellationToken);
        if (columns.Count == 0)
        {
            throw new KeyNotFoundException($"Table '{schema}.{table}' was not found in database '{database}'.");
        }

        var preparedKeys = _valueConverter.PrepareKeyValues(keys, columns);

        await using var conn = _connectionFactory.CreateConnection(connection, database);
        await conn.OpenAsync(cancellationToken);

        var colNames = columns.Select(c => c.Name);
        return await QueryRowByKeysAsync(conn, null, schema, table, preparedKeys, cancellationToken, colNames);
    }

    public async Task<RowOperationResult> CreateRowAsync(
        DatabaseConnection connection,
        string database,
        string schema,
        string table,
        CreateRowRequest request,
        string? userId,
        string? username,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        ValidateWriteAllowed(connection, table);

        var columns = await _metadataService.GetColumnsAsync(connection, database, schema, table, cancellationToken);
        if (columns.Count == 0)
        {
            throw new KeyNotFoundException($"Table '{schema}.{table}' was not found in database '{database}'.");
        }

        var insertValues = _valueConverter.PrepareWritableValues(request.Values, columns, isInsert: true);
        var identityCol = columns.FirstOrDefault(c => c.IsIdentity);
        var pkCols = columns.Where(c => c.IsPrimaryKey).ToList();

        var sql = _sqlBuilder.BuildInsertSql(schema, table, insertValues.Keys, identityCol != null);

        var parameters = new DynamicParameters();
        foreach (var (k, v) in insertValues)
        {
            parameters.Add($"@val_{k}", v);
        }

        await using var conn = _connectionFactory.CreateConnection(connection, database);
        await conn.OpenAsync(cancellationToken);
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);

        try
        {
            long? newIdentityId = null;
            if (identityCol != null)
            {
                newIdentityId = await conn.ExecuteScalarAsync<long?>(
                    new CommandDefinition(sql, parameters, transaction: tx, cancellationToken: cancellationToken));
            }
            else
            {
                await conn.ExecuteAsync(
                    new CommandDefinition(sql, parameters, transaction: tx, cancellationToken: cancellationToken));
            }

            // Fetch created row to return to client and for audit snapshot
            var queryKeys = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
            if (identityCol != null && newIdentityId.HasValue)
            {
                queryKeys[identityCol.Name] = newIdentityId.Value;
            }
            else
            {
                foreach (var pk in pkCols)
                {
                    if (insertValues.TryGetValue(pk.Name, out var pkVal))
                    {
                        queryKeys[pk.Name] = pkVal;
                    }
                }
            }

            IDictionary<string, object?>? createdRow = null;
            if (queryKeys.Count > 0)
            {
                createdRow = await QueryRowByKeysAsync(conn, tx, schema, table, queryKeys, cancellationToken, columns.Select(c => c.Name));
            }

            await tx.CommitAsync(cancellationToken);

            var pkSummary = queryKeys.Count > 0
                ? string.Join(";", queryKeys.Select(k => $"{k.Key}={k.Value}"))
                : "NewRow";

            // Record audit log
            await _auditService.LogAuthEventAsync(
                userId,
                username ?? "system",
                "ROW_INSERT",
                targetType: $"{database}.{schema}.{table}",
                targetId: pkSummary,
                ipAddress: ipAddress,
                success: true,
                metadata: new { after = MaskSensitive(createdRow ?? (IDictionary<string, object?>)insertValues) },
                cancellationToken: cancellationToken);

            return new RowOperationResult
            {
                Success = true,
                AffectedRows = 1,
                Data = createdRow != null ? new Dictionary<string, object?>(createdRow) : null,
                Message = "Row inserted successfully."
            };
        }
        catch
        {
            await tx.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<RowOperationResult> UpdateRowAsync(
        DatabaseConnection connection,
        string database,
        string schema,
        string table,
        UpdateRowRequest request,
        string? userId,
        string? username,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        ValidateWriteAllowed(connection, table);

        var columns = await _metadataService.GetColumnsAsync(connection, database, schema, table, cancellationToken);
        if (columns.Count == 0)
        {
            throw new KeyNotFoundException($"Table '{schema}.{table}' was not found in database '{database}'.");
        }

        var preparedKeys = _valueConverter.PrepareKeyValues(request.Keys, columns);
        var updateValues = _valueConverter.PrepareWritableValues(request.Values, columns, isInsert: false);

        var rvCol = columns.FirstOrDefault(c => c.IsRowVersion);
        string? checkRvColName = null;
        object? checkRvValue = null;

        if (rvCol != null && !string.IsNullOrWhiteSpace(request.RowVersion))
        {
            checkRvColName = rvCol.Name;
            checkRvValue = _valueConverter.ConvertAndValidate(request.RowVersion, rvCol, isRequired: true);
        }

        var sql = _sqlBuilder.BuildUpdateSql(schema, table, updateValues.Keys, preparedKeys.Keys, checkRvColName);

        var parameters = new DynamicParameters();
        foreach (var (k, v) in updateValues)
        {
            parameters.Add($"@val_{k}", v);
        }
        foreach (var (k, v) in preparedKeys)
        {
            parameters.Add($"@key_{k}", v);
        }
        if (checkRvColName != null && checkRvValue != null)
        {
            parameters.Add("@rv_match", checkRvValue);
        }

        await using var conn = _connectionFactory.CreateConnection(connection, database);
        await conn.OpenAsync(cancellationToken);
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);

        try
        {
            var colNames = columns.Select(c => c.Name).ToList();

            // 1. Fetch BEFORE snapshot
            var beforeRow = await QueryRowByKeysAsync(conn, tx, schema, table, preparedKeys, cancellationToken, colNames);
            if (beforeRow == null)
            {
                await tx.RollbackAsync(cancellationToken);
                throw new DynamicCrudException("ROW_NOT_FOUND", "The specified row was not found.", HttpStatusCode.NotFound);
            }

            // Check for No-Op Update: if all updated fields have identical values to beforeRow, return immediately
            var beforeRowDict = new Dictionary<string, object?>(beforeRow, StringComparer.OrdinalIgnoreCase);
            bool hasRealChanges = false;
            foreach (var (colName, newVal) in updateValues)
            {
                beforeRowDict.TryGetValue(colName, out var oldVal);
                if (!_valueConverter.AreValuesEqual(oldVal, newVal))
                {
                    hasRealChanges = true;
                    break;
                }
            }

            if (!hasRealChanges)
            {
                await tx.RollbackAsync(cancellationToken);
                return new RowOperationResult
                {
                    Success = true,
                    AffectedRows = 0,
                    Data = new Dictionary<string, object?>(beforeRowDict),
                    Message = "No fields were changed."
                };
            }

            // 2. Execute UPDATE
            var affected = await conn.ExecuteAsync(
                new CommandDefinition(sql, parameters, transaction: tx, cancellationToken: cancellationToken));

            // 3. Safety checks on affected rows count
            if (affected == 0)
            {
                await tx.RollbackAsync(cancellationToken);
                if (checkRvColName != null)
                {
                    throw new DynamicCrudException(
                        "CONCURRENCY_CONFLICT",
                        "The row has been updated or deleted by another user since you loaded it.",
                        HttpStatusCode.Conflict);
                }
                throw new DynamicCrudException("ROW_NOT_FOUND", "No matching row found to update.", HttpStatusCode.NotFound);
            }

            if (affected > 1)
            {
                await tx.RollbackAsync(cancellationToken);
                throw new InvalidOperationException($"Safety violation: update statement affected {affected} rows instead of exactly 1. Transaction aborted.");
            }

            // 4. Fetch AFTER snapshot
            var afterRow = await QueryRowByKeysAsync(conn, tx, schema, table, preparedKeys, cancellationToken, colNames);

            await tx.CommitAsync(cancellationToken);

            var pkSummary = string.Join(";", preparedKeys.Select(k => $"{k.Key}={k.Value}"));

            // 5. Audit log
            await _auditService.LogAuthEventAsync(
                userId,
                username ?? "system",
                "ROW_UPDATE",
                targetType: $"{database}.{schema}.{table}",
                targetId: pkSummary,
                ipAddress: ipAddress,
                success: true,
                metadata: new
                {
                    before = MaskSensitive(beforeRow),
                    after = MaskSensitive(afterRow ?? (IDictionary<string, object?>)updateValues)
                },
                cancellationToken: cancellationToken);

            return new RowOperationResult
            {
                Success = true,
                AffectedRows = affected,
                Data = afterRow != null ? new Dictionary<string, object?>(afterRow) : null,
                Message = "Row updated successfully."
            };
        }
        catch
        {
            await tx.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<RowOperationResult> DeleteRowAsync(
        DatabaseConnection connection,
        string database,
        string schema,
        string table,
        DeleteRowRequest request,
        string? userId,
        string? username,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        ValidateWriteAllowed(connection, table);

        var columns = await _metadataService.GetColumnsAsync(connection, database, schema, table, cancellationToken);
        if (columns.Count == 0)
        {
            throw new KeyNotFoundException($"Table '{schema}.{table}' was not found in database '{database}'.");
        }

        var preparedKeys = _valueConverter.PrepareKeyValues(request.Keys, columns);

        var rvCol = columns.FirstOrDefault(c => c.IsRowVersion);
        string? checkRvColName = null;
        object? checkRvValue = null;

        if (rvCol != null && !string.IsNullOrWhiteSpace(request.RowVersion))
        {
            checkRvColName = rvCol.Name;
            checkRvValue = _valueConverter.ConvertAndValidate(request.RowVersion, rvCol, isRequired: true);
        }

        var sql = _sqlBuilder.BuildDeleteSql(schema, table, preparedKeys.Keys, checkRvColName);

        var parameters = new DynamicParameters();
        foreach (var (k, v) in preparedKeys)
        {
            parameters.Add($"@key_{k}", v);
        }
        if (checkRvColName != null && checkRvValue != null)
        {
            parameters.Add("@rv_match", checkRvValue);
        }

        await using var conn = _connectionFactory.CreateConnection(connection, database);
        await conn.OpenAsync(cancellationToken);
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);

        try
        {
            // 1. Fetch BEFORE snapshot
            var beforeRow = await QueryRowByKeysAsync(conn, tx, schema, table, preparedKeys, cancellationToken, columns.Select(c => c.Name));
            if (beforeRow == null)
            {
                await tx.RollbackAsync(cancellationToken);
                throw new DynamicCrudException("ROW_NOT_FOUND", "The specified row was not found.", HttpStatusCode.NotFound);
            }

            // 2. Execute DELETE
            var affected = await conn.ExecuteAsync(
                new CommandDefinition(sql, parameters, transaction: tx, cancellationToken: cancellationToken));

            if (affected == 0)
            {
                await tx.RollbackAsync(cancellationToken);
                if (checkRvColName != null)
                {
                    throw new DynamicCrudException(
                        "CONCURRENCY_CONFLICT",
                        "The row has been updated or deleted by another user.",
                        HttpStatusCode.Conflict);
                }
                throw new DynamicCrudException("ROW_NOT_FOUND", "No matching row found to delete.", HttpStatusCode.NotFound);
            }

            if (affected > 1)
            {
                await tx.RollbackAsync(cancellationToken);
                throw new InvalidOperationException($"Safety violation: delete statement affected {affected} rows instead of exactly 1. Transaction aborted.");
            }

            await tx.CommitAsync(cancellationToken);

            var pkSummary = string.Join(";", preparedKeys.Select(k => $"{k.Key}={k.Value}"));

            // 3. Audit log
            await _auditService.LogAuthEventAsync(
                userId,
                username ?? "system",
                "ROW_DELETE",
                targetType: $"{database}.{schema}.{table}",
                targetId: pkSummary,
                ipAddress: ipAddress,
                success: true,
                metadata: new { before = MaskSensitive(beforeRow) },
                cancellationToken: cancellationToken);

            return new RowOperationResult
            {
                Success = true,
                AffectedRows = affected,
                Message = "Row deleted successfully."
            };
        }
        catch
        {
            await tx.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<BulkOperationResult> BulkDeleteRowsAsync(
        DatabaseConnection connection,
        string database,
        string schema,
        string table,
        BulkDeleteRequest request,
        string? userId,
        string? username,
        string? ipAddress,
        CancellationToken cancellationToken = default)
    {
        ValidateWriteAllowed(connection, table);

        if (request.Rows == null || request.Rows.Count == 0)
        {
            return new BulkOperationResult { TotalRequested = 0, DeletedCount = 0, Success = true, Message = "No rows to delete." };
        }

        var maxLimit = _configuration.GetValue<int>("DynamicCrud:MaxBulkDeleteCount", 100);
        if (request.Rows.Count > maxLimit)
        {
            throw new DynamicCrudException(
                "BULK_LIMIT_EXCEEDED",
                $"Cannot delete more than {maxLimit} rows in a single batch request.",
                HttpStatusCode.BadRequest);
        }

        var columns = await _metadataService.GetColumnsAsync(connection, database, schema, table, cancellationToken);
        if (columns.Count == 0)
        {
            throw new KeyNotFoundException($"Table '{schema}.{table}' was not found in database '{database}'.");
        }

        var pkCols = columns.Where(c => c.IsPrimaryKey).ToList();
        if (pkCols.Count == 0)
        {
            throw new DynamicCrudException("MISSING_PRIMARY_KEY", "Table has no primary key defined. Bulk delete is not supported.", HttpStatusCode.BadRequest);
        }

        await using var conn = _connectionFactory.CreateConnection(connection, database);
        await conn.OpenAsync(cancellationToken);
        await using var tx = await conn.BeginTransactionAsync(cancellationToken);

        int deletedCount = 0;
        var deletedKeysList = new List<string>();

        try
        {
            foreach (var item in request.Rows)
            {
                var preparedKeys = _valueConverter.PrepareKeyValues(item.Keys, columns);
                var sql = _sqlBuilder.BuildDeleteSql(schema, table, preparedKeys.Keys);

                var parameters = new DynamicParameters();
                foreach (var (k, v) in preparedKeys)
                {
                    parameters.Add($"@key_{k}", v);
                }

                var affected = await conn.ExecuteAsync(
                    new CommandDefinition(sql, parameters, transaction: tx, cancellationToken: cancellationToken));

                if (affected > 0)
                {
                    deletedCount += affected;
                    deletedKeysList.Add(string.Join(";", preparedKeys.Select(k => $"{k.Key}={k.Value}")));
                }
            }

            await tx.CommitAsync(cancellationToken);

            // Audit log
            await _auditService.LogAuthEventAsync(
                userId,
                username ?? "system",
                "ROW_BULK_DELETE",
                targetType: $"{database}.{schema}.{table}",
                targetId: $"Count={deletedCount}",
                ipAddress: ipAddress,
                success: true,
                metadata: new { deletedKeys = deletedKeysList, totalRequested = request.Rows.Count, deletedCount = deletedCount },
                cancellationToken: cancellationToken);

            return new BulkOperationResult
            {
                TotalRequested = request.Rows.Count,
                DeletedCount = deletedCount,
                Success = true,
                Message = $"Successfully deleted {deletedCount} of {request.Rows.Count} rows."
            };
        }
        catch
        {
            await tx.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public async Task<IReadOnlyList<LookupItemDto>> GetLookupValuesAsync(
        DatabaseConnection connection,
        string database,
        string schema,
        string table,
        string column,
        string? search = null,
        int top = 50,
        CancellationToken cancellationToken = default)
    {
        var columns = await _metadataService.GetColumnsAsync(connection, database, schema, table, cancellationToken);
        var colMeta = columns.FirstOrDefault(c => string.Equals(c.Name, column, StringComparison.OrdinalIgnoreCase));
        if (colMeta == null)
        {
            throw new KeyNotFoundException($"Column '{column}' was not found in table '{schema}.{table}'.");
        }

        var sql = _sqlBuilder.BuildLookupSql(schema, table, colMeta.Name, search, top);

        await using var conn = _connectionFactory.CreateConnection(connection, database);
        await conn.OpenAsync(cancellationToken);

        var parameters = new DynamicParameters();
        if (!string.IsNullOrWhiteSpace(search))
        {
            parameters.Add("@search", $"%{search.Trim()}%");
        }

        var rows = await conn.QueryAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        var result = new List<LookupItemDto>();

        foreach (var r in rows)
        {
            result.Add(new LookupItemDto
            {
                Value = r.Value,
                Label = r.Label?.ToString() ?? string.Empty
            });
        }

        return result;
    }

    public async Task<IReadOnlyList<RowAuditHistoryItem>> GetRowAuditHistoryAsync(
        string database,
        string schema,
        string table,
        string? targetId = null,
        CancellationToken cancellationToken = default)
    {
        var targetType = $"{database}.{schema}.{table}";
        var auditLogs = await _auditService.GetAuditLogsAsync(
            page: 1,
            pageSize: 50,
            cancellationToken: cancellationToken);

        var filtered = auditLogs.Items
            .Where(a => string.Equals(a.TargetType, targetType, StringComparison.OrdinalIgnoreCase) &&
                        (string.IsNullOrWhiteSpace(targetId) || string.Equals(a.TargetId, targetId, StringComparison.OrdinalIgnoreCase)))
            .Select(a =>
            {
                object? parsedDiff = null;
                if (!string.IsNullOrWhiteSpace(a.MetadataJson))
                {
                    try
                    {
                        parsedDiff = JsonSerializer.Deserialize<object>(a.MetadataJson);
                    }
                    catch
                    {
                        parsedDiff = a.MetadataJson;
                    }
                }

                return new RowAuditHistoryItem
                {
                    Id = a.Id,
                    Username = a.Username,
                    Action = a.Action,
                    Timestamp = a.Timestamp,
                    Success = a.Success,
                    Diff = parsedDiff
                };
            })
            .ToList();

        return filtered;
    }

    private void ValidateWriteAllowed(DatabaseConnection connection, string table)
    {
        if (!connection.AllowWrite)
        {
            throw new DynamicCrudException(
                "WRITE_DISABLED",
                "This database connection is configured as Read-Only (AllowWrite is disabled).",
                HttpStatusCode.Forbidden);
        }

        if (IsTableProtected(table))
        {
            throw new DynamicCrudException(
                "PROTECTED_TABLE",
                $"Table '{table}' is protected and cannot be modified directly.",
                HttpStatusCode.Forbidden);
        }
    }

    private bool IsTableProtected(string table)
    {
        var protectedTables = _configuration.GetSection("DynamicCrud:ProtectedTables").Get<string[]>() ?? Array.Empty<string>();
        return protectedTables.Any(p => string.Equals(p, table, StringComparison.OrdinalIgnoreCase));
    }

    private async Task<IDictionary<string, object?>?> QueryRowByKeysAsync(
        DbConnection conn,
        DbTransaction? tx,
        string schema,
        string table,
        IReadOnlyDictionary<string, object?> keys,
        CancellationToken cancellationToken,
        IEnumerable<string>? selectColumns = null)
    {
        var sql = _sqlBuilder.BuildSelectByKeysSql(schema, table, keys.Keys, selectColumns);
        var parameters = new DynamicParameters();
        foreach (var (k, v) in keys)
        {
            parameters.Add($"@key_{k}", v);
        }

        var cmd = new CommandDefinition(sql, parameters, transaction: tx, cancellationToken: cancellationToken);
        var row = await conn.QueryFirstOrDefaultAsync(cmd);
        return row != null ? (IDictionary<string, object?>)row : null;
    }

    private static IDictionary<string, object?>? MaskSensitive(IDictionary<string, object?>? row)
    {
        if (row == null) return null;
        var copy = new Dictionary<string, object?>(row, StringComparer.OrdinalIgnoreCase);
        foreach (var key in copy.Keys.ToList())
        {
            if (key.Contains("password", StringComparison.OrdinalIgnoreCase) ||
                key.Contains("secret", StringComparison.OrdinalIgnoreCase) ||
                key.Contains("token", StringComparison.OrdinalIgnoreCase) ||
                key.Contains("hash", StringComparison.OrdinalIgnoreCase))
            {
                copy[key] = "********";
            }
        }
        return copy;
    }
}
