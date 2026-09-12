using System.Net;

namespace DBHub.Api.Infrastructure;

public class DynamicCrudException : Exception
{
    public string ErrorCode { get; }
    public HttpStatusCode StatusCode { get; }
    public object? Details { get; }

    public DynamicCrudException(string errorCode, string message, HttpStatusCode statusCode = HttpStatusCode.BadRequest, Exception? innerException = null, object? details = null)
        : base(message, innerException)
    {
        ErrorCode = errorCode;
        StatusCode = statusCode;
        Details = details;
    }
}
