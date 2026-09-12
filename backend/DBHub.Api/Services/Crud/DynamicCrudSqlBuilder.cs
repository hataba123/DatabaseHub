using System.Text;
using DBHub.Api.Infrastructure;

namespace DBHub.Api.Services.Crud;

public class DynamicCrudSqlBuilder : IDynamicCrudSqlBuilder
{
    public string BuildSelectByKeysSql(
        string schema,
        string table,
        IEnumerable<string> keyColumns,
        IEnumerable<string>? selectColumns = null)
    {
        var quotedSchema = SqlIdentifierValidator.ValidateAndQuote(schema, nameof(schema));
        var quotedTable = SqlIdentifierValidator.ValidateAndQuote(table, nameof(table));

        var sb = new StringBuilder();
        sb.Append("SELECT ");
        var colList = selectColumns?.ToList();
        if (colList != null && colList.Count > 0)
        {
            var quotedCols = colList.Select(c => SqlIdentifierValidator.ValidateAndQuote(c));
            sb.Append(string.Join(", ", quotedCols));
        }
        else
        {
            sb.Append('*');
        }
        sb.Append($" FROM {quotedSchema}.{quotedTable} WHERE ");

        var conditions = keyColumns.Select(col =>
        {
            var quotedCol = SqlIdentifierValidator.ValidateAndQuote(col);
            return $"{quotedCol} = @key_{col}";
        });

        sb.Append(string.Join(" AND ", conditions));
        sb.Append(';');
        return sb.ToString();
    }

    public string BuildInsertSql(
        string schema,
        string table,
        IEnumerable<string> insertColumns,
        bool hasIdentity)
    {
        var quotedSchema = SqlIdentifierValidator.ValidateAndQuote(schema, nameof(schema));
        var quotedTable = SqlIdentifierValidator.ValidateAndQuote(table, nameof(table));

        var colList = insertColumns.ToList();
        var sb = new StringBuilder();

        if (colList.Count == 0)
        {
            // If all columns have defaults or are identity
            sb.Append($"INSERT INTO {quotedSchema}.{quotedTable} DEFAULT VALUES;");
        }
        else
        {
            var quotedCols = colList.Select(c => SqlIdentifierValidator.ValidateAndQuote(c));
            var paramNames = colList.Select(c => $"@val_{c}");

            sb.Append($"INSERT INTO {quotedSchema}.{quotedTable} (");
            sb.Append(string.Join(", ", quotedCols));
            sb.Append(") VALUES (");
            sb.Append(string.Join(", ", paramNames));
            sb.Append(");");
        }

        if (hasIdentity)
        {
            sb.Append(" SELECT SCOPE_IDENTITY() AS [NewIdentityId];");
        }

        return sb.ToString();
    }

    public string BuildUpdateSql(
        string schema,
        string table,
        IEnumerable<string> updateColumns,
        IEnumerable<string> keyColumns,
        string? rowVersionColumn = null)
    {
        var quotedSchema = SqlIdentifierValidator.ValidateAndQuote(schema, nameof(schema));
        var quotedTable = SqlIdentifierValidator.ValidateAndQuote(table, nameof(table));

        var sb = new StringBuilder();
        sb.Append($"UPDATE {quotedSchema}.{quotedTable} SET ");

        var setClauses = updateColumns.Select(c =>
        {
            var quotedCol = SqlIdentifierValidator.ValidateAndQuote(c);
            return $"{quotedCol} = @val_{c}";
        });

        sb.Append(string.Join(", ", setClauses));
        sb.Append(" WHERE ");

        var whereClauses = keyColumns.Select(k =>
        {
            var quotedCol = SqlIdentifierValidator.ValidateAndQuote(k);
            return $"{quotedCol} = @key_{k}";
        }).ToList();

        if (!string.IsNullOrWhiteSpace(rowVersionColumn))
        {
            var quotedRv = SqlIdentifierValidator.ValidateAndQuote(rowVersionColumn);
            whereClauses.Add($"{quotedRv} = @rv_match");
        }

        sb.Append(string.Join(" AND ", whereClauses));
        sb.Append(';');
        return sb.ToString();
    }

    public string BuildDeleteSql(
        string schema,
        string table,
        IEnumerable<string> keyColumns,
        string? rowVersionColumn = null)
    {
        var quotedSchema = SqlIdentifierValidator.ValidateAndQuote(schema, nameof(schema));
        var quotedTable = SqlIdentifierValidator.ValidateAndQuote(table, nameof(table));

        var sb = new StringBuilder();
        sb.Append($"DELETE FROM {quotedSchema}.{quotedTable} WHERE ");

        var whereClauses = keyColumns.Select(k =>
        {
            var quotedCol = SqlIdentifierValidator.ValidateAndQuote(k);
            return $"{quotedCol} = @key_{k}";
        }).ToList();

        if (!string.IsNullOrWhiteSpace(rowVersionColumn))
        {
            var quotedRv = SqlIdentifierValidator.ValidateAndQuote(rowVersionColumn);
            whereClauses.Add($"{quotedRv} = @rv_match");
        }

        sb.Append(string.Join(" AND ", whereClauses));
        sb.Append(';');
        return sb.ToString();
    }

    public string BuildLookupSql(
        string schema,
        string table,
        string column,
        string? search = null,
        int top = 50)
    {
        var quotedSchema = SqlIdentifierValidator.ValidateAndQuote(schema, nameof(schema));
        var quotedTable = SqlIdentifierValidator.ValidateAndQuote(table, nameof(table));
        var quotedCol = SqlIdentifierValidator.ValidateAndQuote(column);

        var safeTop = Math.Clamp(top, 1, 100);
        var sb = new StringBuilder();
        sb.Append($"SELECT DISTINCT TOP {safeTop} {quotedCol} AS [Value], CAST({quotedCol} AS NVARCHAR(250)) AS [Label] FROM {quotedSchema}.{quotedTable} WHERE {quotedCol} IS NOT NULL");
        if (!string.IsNullOrWhiteSpace(search))
        {
            sb.Append($" AND CAST({quotedCol} AS NVARCHAR(MAX)) LIKE @search");
        }
        sb.Append(" ORDER BY [Label];");
        return sb.ToString();
    }
}
