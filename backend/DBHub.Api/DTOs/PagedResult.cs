namespace DBHub.Api.DTOs;

public class PagedResult<T>
{
    public IEnumerable<T> Items { get; set; } = Enumerable.Empty<T>();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public long TotalRows { get; set; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalRows / PageSize) : 0;
}

public class ErrorResponse
{
    public string Code { get; set; } = "INTERNAL_ERROR";
    public string Message { get; set; } = string.Empty;
    public string? TraceId { get; set; }
}
