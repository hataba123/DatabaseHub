using System.Text.RegularExpressions;

namespace DBHub.Api.Infrastructure;

public static class SqlIdentifierValidator
{
    // SQL Server valid regular identifier pattern
    private static readonly Regex IdentifierRegex = new(
        @"^[a-zA-Z_@#][a-zA-Z0-9_@#$]*$",
        RegexOptions.Compiled);

    public static bool IsValidIdentifier(string? identifier)
    {
        if (string.IsNullOrWhiteSpace(identifier))
            return false;

        var trimmed = identifier.Trim();

        // Enforce max length of 128 characters (SQL Server SYSNAME limit)
        if (trimmed.Length > 128)
            return false;

        // Disallow dangerous keywords or punctuation directly
        if (trimmed.Contains(';') ||
            trimmed.Contains("--") ||
            trimmed.Contains("/*") ||
            trimmed.Contains("*/") ||
            trimmed.Contains('\'') ||
            trimmed.Contains('\"'))
        {
            return false;
        }

        return IdentifierRegex.IsMatch(trimmed);
    }

    public static string ValidateAndQuote(string? identifier, string parameterName = "Identifier")
    {
        if (string.IsNullOrWhiteSpace(identifier))
            throw new ArgumentException($"{parameterName} cannot be null or empty.", parameterName);

        var trimmed = identifier.Trim();

        if (!IsValidIdentifier(trimmed))
            throw new ArgumentException($"Invalid SQL identifier for {parameterName}: '{trimmed}'. Potential injection or illegal characters detected.", parameterName);

        // Escape any closing bracket just in case and wrap in []
        return $"[{trimmed.Replace("]", "]]")}]";
    }

    public static string ValidateSortDirection(string? direction)
    {
        if (string.IsNullOrWhiteSpace(direction))
            return "ASC";

        var upper = direction.Trim().ToUpperInvariant();
        return upper switch
        {
            "ASC" or "ASCEND" => "ASC",
            "DESC" or "DESCEND" => "DESC",
            _ => throw new ArgumentException($"Invalid sort direction: '{direction}'. Only 'ASC' or 'DESC' allowed.")
        };
    }

    public static int SanitizePageSize(int pageSize, int defaultSize = 50, int maxSize = 500)
    {
        if (pageSize <= 0) return defaultSize;
        if (pageSize > maxSize) return maxSize;
        return pageSize;
    }

    public static int SanitizePage(int page)
    {
        return page <= 0 ? 1 : page;
    }
}
