using System.Text;
using System.Text.Json;
using Dapper;
using DBHub.Api.DTOs;
using DBHub.Api.Infrastructure;
using DBHub.Api.Models;

namespace DBHub.Api.Services;

public class TableDataQueryService : ITableDataQueryService
{
    private readonly ISqlConnectionFactory _connectionFactory;
    private readonly ISqlServerMetadataService _metadataService;
    private readonly ILogger<TableDataQueryService> _logger;

    public TableDataQueryService(
        ISqlConnectionFactory connectionFactory,
        ISqlServerMetadataService metadataService,
        ILogger<TableDataQueryService> logger)
    {
        _connectionFactory = connectionFactory;
        _metadataService = metadataService;
        _logger = logger;
    }

    public async Task<PagedResult<IDictionary<string, object?>>> GetRowsAsync(
        DatabaseConnection connection,
        string database,
        string schema,
        string table,
        TableDataQueryRequest request,
        CancellationToken cancellationToken = default)
    {
        // 1. Strict identifier syntax validation
        var quotedSchema = SqlIdentifierValidator.ValidateAndQuote(schema, nameof(schema));
        var quotedTable = SqlIdentifierValidator.ValidateAndQuote(table, nameof(table));

        // 2. Fetch column metadata to ensure schema and table exist in the database
        var columns = await _metadataService.GetColumnsAsync(connection, database, schema, table, cancellationToken);
        if (columns.Count == 0)
        {
            throw new KeyNotFoundException($"Table {schema}.{table} was not found in database {database}.");
        }

        var columnDict = columns.ToDictionary(c => c.Name, StringComparer.OrdinalIgnoreCase);

        // 3. Prepare parameters and where clauses
        var parameters = new DynamicParameters();
        var whereConditions = new List<string>();
        int paramCounter = 0;

        // Global search across textual columns
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var textCols = columns
                .Where(c => c.DataType.Contains("char", StringComparison.OrdinalIgnoreCase))
                .Take(8)
                .ToList();

            if (textCols.Count > 0)
            {
                var searchParamName = $"@search_{paramCounter++}";
                parameters.Add(searchParamName, $"%{request.Search.Trim()}%");

                var searchClauses = textCols.Select(c => $"{SqlIdentifierValidator.ValidateAndQuote(c.Name)} LIKE {searchParamName}");
                whereConditions.Add($"({string.Join(" OR ", searchClauses)})");
            }
        }

        // Structured filter builder criteria
        if (request.Filters != null && request.Filters.Count > 0)
        {
            foreach (var filter in request.Filters)
            {
                if (string.IsNullOrWhiteSpace(filter.Field) || !columnDict.TryGetValue(filter.Field, out var colMeta))
                {
                    continue; // Skip fields that don't exist in metadata
                }

                var quotedCol = SqlIdentifierValidator.ValidateAndQuote(colMeta.Name);
                var p1 = $"@p_{paramCounter++}";
                var op = filter.Operator?.ToLowerInvariant() ?? "eq";

                var rawVal = ExtractRawValue(filter.Value);
                var rawVal2 = ExtractRawValue(filter.Value2);

                switch (op)
                {
                    case "eq" or "equals":
                        parameters.Add(p1, rawVal);
                        whereConditions.Add($"{quotedCol} = {p1}");
                        break;

                    case "neq" or "notequals":
                        parameters.Add(p1, rawVal);
                        whereConditions.Add($"{quotedCol} <> {p1}");
                        break;

                    case "contains":
                        parameters.Add(p1, $"%{rawVal}%");
                        whereConditions.Add($"{quotedCol} LIKE {p1}");
                        break;

                    case "startswith":
                        parameters.Add(p1, $"{rawVal}%");
                        whereConditions.Add($"{quotedCol} LIKE {p1}");
                        break;

                    case "endswith":
                        parameters.Add(p1, $"%{rawVal}");
                        whereConditions.Add($"{quotedCol} LIKE {p1}");
                        break;

                    case "isempty":
                        whereConditions.Add($"({quotedCol} IS NULL OR {quotedCol} = '')");
                        break;

                    case "isnotempty":
                        whereConditions.Add($"({quotedCol} IS NOT NULL AND {quotedCol} <> '')");
                        break;

                    case "isnull":
                        whereConditions.Add($"{quotedCol} IS NULL");
                        break;

                    case "isnotnull":
                        whereConditions.Add($"{quotedCol} IS NOT NULL");
                        break;

                    case "gt":
                        parameters.Add(p1, rawVal);
                        whereConditions.Add($"{quotedCol} > {p1}");
                        break;

                    case "gte":
                        parameters.Add(p1, rawVal);
                        whereConditions.Add($"{quotedCol} >= {p1}");
                        break;

                    case "lt":
                        parameters.Add(p1, rawVal);
                        whereConditions.Add($"{quotedCol} < {p1}");
                        break;

                    case "lte":
                        parameters.Add(p1, rawVal);
                        whereConditions.Add($"{quotedCol} <= {p1}");
                        break;

                    case "between":
                        var p2 = $"@p_{paramCounter++}";
                        parameters.Add(p1, rawVal);
                        parameters.Add(p2, rawVal2 ?? rawVal);
                        whereConditions.Add($"{quotedCol} BETWEEN {p1} AND {p2}");
                        break;

                    case "istrue":
                        whereConditions.Add($"{quotedCol} = 1");
                        break;

                    case "isfalse":
                        whereConditions.Add($"{quotedCol} = 0");
                        break;

                    case "dateequals":
                        parameters.Add(p1, rawVal);
                        whereConditions.Add($"CAST({quotedCol} AS DATE) = CAST({p1} AS DATE)");
                        break;

                    case "datebefore":
                        parameters.Add(p1, rawVal);
                        whereConditions.Add($"{quotedCol} < {p1}");
                        break;

                    case "dateafter":
                        parameters.Add(p1, rawVal);
                        whereConditions.Add($"{quotedCol} > {p1}");
                        break;

                    case "datebetween":
                        var pd2 = $"@p_{paramCounter++}";
                        parameters.Add(p1, rawVal);
                        parameters.Add(pd2, rawVal2 ?? rawVal);
                        whereConditions.Add($"{quotedCol} BETWEEN {p1} AND {pd2}");
                        break;
                }
            }
        }

        var whereSql = whereConditions.Count > 0
            ? "WHERE " + string.Join(" AND ", whereConditions)
            : string.Empty;

        // 4. Sorting clause
        string orderSql;
        if (!string.IsNullOrWhiteSpace(request.SortColumn) && columnDict.TryGetValue(request.SortColumn, out var sortColMeta))
        {
            var sortDir = SqlIdentifierValidator.ValidateSortDirection(request.SortDirection);
            orderSql = $"ORDER BY {SqlIdentifierValidator.ValidateAndQuote(sortColMeta.Name)} {sortDir}";
        }
        else
        {
            var pkCol = columns.FirstOrDefault(c => c.IsPrimaryKey);
            orderSql = pkCol != null
                ? $"ORDER BY {SqlIdentifierValidator.ValidateAndQuote(pkCol.Name)} ASC"
                : "ORDER BY (SELECT 1)";
        }

        // 5. Paging bounds
        var page = SqlIdentifierValidator.SanitizePage(request.Page);
        var pageSize = SqlIdentifierValidator.SanitizePageSize(request.PageSize, defaultSize: 50, maxSize: 500);
        var offset = (page - 1) * pageSize;

        parameters.Add("@Offset", offset);
        parameters.Add("@PageSize", pageSize);

        // 6. Build final SQL queries
        var countQuery = $"SELECT COUNT_BIG(1) FROM {quotedSchema}.{quotedTable} {whereSql};";
        var pageQuery = $"SELECT * FROM {quotedSchema}.{quotedTable} {whereSql} {orderSql} OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;";

        await using var conn = _connectionFactory.CreateConnection(connection, database);
        await conn.OpenAsync(cancellationToken);

        var countCmd = new CommandDefinition(countQuery, parameters, commandTimeout: 30, cancellationToken: cancellationToken);
        var totalRows = await conn.ExecuteScalarAsync<long>(countCmd);

        var dataCmd = new CommandDefinition(pageQuery, parameters, commandTimeout: 30, cancellationToken: cancellationToken);
        var rows = (await conn.QueryAsync(dataCmd)).Cast<IDictionary<string, object?>>().ToList();

        return new PagedResult<IDictionary<string, object?>>
        {
            Items = rows,
            Page = page,
            PageSize = pageSize,
            TotalRows = totalRows
        };
    }

    private static object? ExtractRawValue(object? value)
    {
        if (value is JsonElement jsonElem)
        {
            return jsonElem.ValueKind switch
            {
                JsonValueKind.String => jsonElem.GetString(),
                JsonValueKind.Number => jsonElem.TryGetInt64(out var l) ? l : jsonElem.GetDouble(),
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                JsonValueKind.Null => null,
                _ => jsonElem.ToString()
            };
        }
        return value;
    }
}
