namespace DBHub.Api.Services.Crud;

public interface IDynamicCrudSqlBuilder
{
    string BuildSelectByKeysSql(string schema, string table, IEnumerable<string> keyColumns);

    string BuildInsertSql(
        string schema,
        string table,
        IEnumerable<string> insertColumns,
        bool hasIdentity);

    string BuildUpdateSql(
        string schema,
        string table,
        IEnumerable<string> updateColumns,
        IEnumerable<string> keyColumns,
        string? rowVersionColumn = null);

    string BuildDeleteSql(
        string schema,
        string table,
        IEnumerable<string> keyColumns,
        string? rowVersionColumn = null);

    string BuildLookupSql(
        string schema,
        string table,
        string column,
        int top = 50);
}
