namespace DBHub.Api.Models;

public class DatabaseItem
{
    public string Name { get; set; } = string.Empty;
    public string State { get; set; } = "ONLINE";
    public DateTime? CreatedAt { get; set; }
    public decimal? SizeMb { get; set; }
}

public class TableItem
{
    public string Schema { get; set; } = "dbo";
    public string Name { get; set; } = string.Empty;
    public long RowCount { get; set; }
}

public class ViewItem
{
    public string Schema { get; set; } = "dbo";
    public string Name { get; set; } = string.Empty;
}

public class ProcedureItem
{
    public string Schema { get; set; } = "dbo";
    public string Name { get; set; } = string.Empty;
}

public class ColumnItem
{
    public string Name { get; set; } = string.Empty;
    public string DataType { get; set; } = string.Empty;
    public int? MaxLength { get; set; }
    public int? Precision { get; set; }
    public int? Scale { get; set; }
    public bool Nullable { get; set; }
    public bool IsPrimaryKey { get; set; }
    public bool IsIdentity { get; set; }
    public bool IsComputed { get; set; }
    public bool IsRowVersion { get; set; }
    public bool HasDefault { get; set; }
    public string? DefaultValue { get; set; }
    public bool IsWritable => !IsIdentity && !IsComputed && !IsRowVersion;
}

public class IndexItem
{
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = "NONCLUSTERED";
    public bool Unique { get; set; }
    public bool PrimaryKey { get; set; }
    public List<string> Columns { get; set; } = new();
}

public class RelationshipItem
{
    public string Name { get; set; } = string.Empty;
    public string Column { get; set; } = string.Empty;
    public string ReferencedSchema { get; set; } = "dbo";
    public string ReferencedTable { get; set; } = string.Empty;
    public string ReferencedColumn { get; set; } = string.Empty;
}
