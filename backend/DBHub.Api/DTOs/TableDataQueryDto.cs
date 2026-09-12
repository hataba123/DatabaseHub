using System.Text.Json;

namespace DBHub.Api.DTOs;

public class FilterConditionDto
{
    public string Field { get; set; } = string.Empty;
    public string Operator { get; set; } = "eq";
    public object? Value { get; set; }
    public object? Value2 { get; set; }
}

public class TableDataQueryRequest
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public string? Search { get; set; }
    public string? SortColumn { get; set; }
    public string? SortDirection { get; set; } = "asc";
    public List<FilterConditionDto> Filters { get; set; } = new();
}
