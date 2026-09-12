namespace DBHub.Api.Security;

public class ResourceScope
{
    public string? ConnectionId { get; set; }
    public string? DatabaseName { get; set; }
    public string? SchemaName { get; set; }
    public string? TableName { get; set; }

    public ResourceScope() { }

    public ResourceScope(string? connectionId, string? databaseName = null, string? schemaName = null, string? tableName = null)
    {
        ConnectionId = connectionId;
        DatabaseName = databaseName;
        SchemaName = schemaName;
        TableName = tableName;
    }
}
