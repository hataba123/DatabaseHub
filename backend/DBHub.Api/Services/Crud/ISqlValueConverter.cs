using DBHub.Api.Models;

namespace DBHub.Api.Services.Crud;

public interface ISqlValueConverter
{
    /// <summary>
    /// Converts a raw value (e.g. JsonElement, string, number) into a typed object suitable for Dapper/SqlClient parameter binding.
    /// Throws DynamicCrudException if validation fails.
    /// </summary>
    object? ConvertAndValidate(object? rawValue, ColumnItem column, bool isRequired = false);

    /// <summary>
    /// Filters and converts input dictionary to only valid writable columns for INSERT or UPDATE.
    /// </summary>
    Dictionary<string, object?> PrepareWritableValues(
        IDictionary<string, object?> inputValues,
        IReadOnlyList<ColumnItem> columns,
        bool isInsert);

    /// <summary>
    /// Prepares and validates Primary Key values for WHERE clauses.
    /// </summary>
    Dictionary<string, object?> PrepareKeyValues(
        IDictionary<string, object?> inputKeys,
        IReadOnlyList<ColumnItem> columns);

    /// <summary>
    /// Compares two database/converted values for semantic equality to detect no-op updates.
    /// </summary>
    bool AreValuesEqual(object? val1, object? val2);
}
