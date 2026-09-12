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
            DynamicCrudException crudEx =>
                (crudEx.StatusCode, crudEx.ErrorCode, crudEx.Message),

            SqlException sqlEx when sqlEx.Number == -2 || sqlEx.Message.Contains("Timeout", StringComparison.OrdinalIgnoreCase) =>
                (HttpStatusCode.RequestTimeout, "QUERY_TIMEOUT", "The query exceeded the allowed execution time (30s limit)."),

            SqlException sqlEx when sqlEx.Number is 4060 or 18456 or 53 =>
                (HttpStatusCode.BadGateway, "DATABASE_CONNECTION_FAILED", "Unable to establish connection to SQL Server instance."),

            SqlException sqlEx when sqlEx.Number is 2601 or 2627 =>
                (HttpStatusCode.Conflict, "DUPLICATE_KEY", "A record with this primary key or unique index already exists."),

            SqlException sqlEx when sqlEx.Number == 547 =>
                (HttpStatusCode.Conflict, "FOREIGN_KEY_VIOLATION", "The operation violates a foreign key constraint (record is referenced by other tables or foreign key target does not exist)."),

            SqlException sqlEx when sqlEx.Number is 8152 or 2628 =>
                (HttpStatusCode.BadRequest, "DATA_TOO_LONG", "String or binary data would be truncated because it exceeds the maximum column length."),

            SqlException sqlEx when sqlEx.Number == 515 =>
                (HttpStatusCode.BadRequest, "NULL_NOT_ALLOWED", "Cannot insert or update NULL into a required non-nullable column."),

            SqlException sqlEx when sqlEx.Number == 1205 =>
                (HttpStatusCode.Conflict, "DEADLOCK_DETECTED", "Transaction was deadlocked and selected as victim. Please retry."),

            SqlException sqlEx =>
                (HttpStatusCode.BadRequest, "SQL_EXECUTION_ERROR", $"SQL Server error ({sqlEx.Number}): {sqlEx.Message}"),

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
