using System.Net;
using DBHub.Api.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Data.SqlClient;

namespace DBHub.Api.Infrastructure;

public class GlobalExceptionFilter : IExceptionFilter
{
    private readonly ILogger<GlobalExceptionFilter> _logger;

    public GlobalExceptionFilter(ILogger<GlobalExceptionFilter> logger)
    {
        _logger = logger;
    }

    public void OnException(ExceptionContext context)
    {
        var traceId = context.HttpContext.TraceIdentifier;
        _logger.LogError(context.Exception, "Unhandled exception occurred. TraceId: {TraceId}", traceId);

        var (statusCode, code, message) = context.Exception switch
        {
            SqlException sqlEx when sqlEx.Number == -2 || sqlEx.Message.Contains("Timeout", StringComparison.OrdinalIgnoreCase) =>
                (HttpStatusCode.RequestTimeout, "QUERY_TIMEOUT", "The query exceeded the allowed execution time (30s limit)."),

            SqlException sqlEx when sqlEx.Number is 4060 or 18456 or 53 =>
                (HttpStatusCode.BadGateway, "DATABASE_CONNECTION_FAILED", "Unable to establish connection to SQL Server instance."),

            SqlException sqlEx =>
                (HttpStatusCode.BadRequest, "SQL_EXECUTION_ERROR", $"SQL Server error: {sqlEx.Message}"),

            ArgumentException argEx =>
                (HttpStatusCode.BadRequest, "INVALID_ARGUMENT", argEx.Message),

            KeyNotFoundException notFoundEx =>
                (HttpStatusCode.NotFound, "RESOURCE_NOT_FOUND", notFoundEx.Message),

            OperationCanceledException =>
                ((HttpStatusCode)499, "REQUEST_CANCELLED", "The operation was cancelled."),

            _ =>
                (HttpStatusCode.InternalServerError, "INTERNAL_ERROR", "An unexpected error occurred while processing the database request.")
        };

        var errorResponse = new ErrorResponse
        {
            Code = code,
            Message = message,
            TraceId = traceId
        };

        context.Result = new ObjectResult(errorResponse)
        {
            StatusCode = (int)statusCode
        };

        context.ExceptionHandled = true;
    }
}
