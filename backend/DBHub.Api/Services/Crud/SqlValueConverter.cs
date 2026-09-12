using System.Globalization;
using System.Net;
using System.Text.Json;
using DBHub.Api.Infrastructure;
using DBHub.Api.Models;

namespace DBHub.Api.Services.Crud;

public class SqlValueConverter : ISqlValueConverter
{
    public object? ConvertAndValidate(object? rawValue, ColumnItem column, bool isRequired = false)
    {
        var unwrapped = UnwrapRawValue(rawValue);

        if (unwrapped == null || (unwrapped is string s && string.IsNullOrWhiteSpace(s) && !IsStringType(column.DataType)))
        {
            if (!column.Nullable && isRequired && !column.HasDefault && !column.IsIdentity)
            {
                throw new DynamicCrudException(
                    "NULL_NOT_ALLOWED",
                    $"Column '{column.Name}' cannot be null.",
                    HttpStatusCode.BadRequest);
            }
            return DBNull.Value;
        }

        var normalizedType = column.DataType.ToLowerInvariant();

        // 1. Strings
        if (IsStringType(normalizedType))
        {
            var strVal = unwrapped.ToString() ?? string.Empty;
            if (column.MaxLength.HasValue && column.MaxLength.Value > 0 && strVal.Length > column.MaxLength.Value)
            {
                throw new DynamicCrudException(
                    "DATA_TOO_LONG",
                    $"Value for column '{column.Name}' has length {strVal.Length}, exceeding maximum allowed length of {column.MaxLength.Value}.",
                    HttpStatusCode.BadRequest);
            }
            return strVal;
        }

        // 2. Integers
        if (normalizedType is "int")
        {
            if (unwrapped is int i) return i;
            if (int.TryParse(unwrapped.ToString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed))
            {
                return parsed;
            }
            throw new DynamicCrudException("INVALID_DATA_TYPE", $"Cannot convert '{unwrapped}' to integer for column '{column.Name}'.");
        }

        if (normalizedType is "bigint")
        {
            if (unwrapped is long l) return l;
            if (long.TryParse(unwrapped.ToString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed))
            {
                return parsed;
            }
            throw new DynamicCrudException("INVALID_DATA_TYPE", $"Cannot convert '{unwrapped}' to bigint for column '{column.Name}'.");
        }

        if (normalizedType is "smallint")
        {
            if (unwrapped is short sVal) return sVal;
            if (short.TryParse(unwrapped.ToString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed))
            {
                return parsed;
            }
            throw new DynamicCrudException("INVALID_DATA_TYPE", $"Cannot convert '{unwrapped}' to smallint for column '{column.Name}'.");
        }

        if (normalizedType is "tinyint")
        {
            if (unwrapped is byte bVal) return bVal;
            if (byte.TryParse(unwrapped.ToString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed))
            {
                return parsed;
            }
            throw new DynamicCrudException("INVALID_DATA_TYPE", $"Cannot convert '{unwrapped}' to tinyint for column '{column.Name}'.");
        }

        // 3. Decimals & Floats
        if (normalizedType is "decimal" or "numeric" or "money" or "smallmoney")
        {
            decimal dVal;
            if (unwrapped is decimal d)
            {
                dVal = d;
            }
            else if (decimal.TryParse(unwrapped.ToString(), NumberStyles.Number, CultureInfo.InvariantCulture, out var parsed))
            {
                dVal = parsed;
            }
            else
            {
                throw new DynamicCrudException("INVALID_DATA_TYPE", $"Cannot convert '{unwrapped}' to decimal for column '{column.Name}'.");
            }

            if (column.Precision.HasValue && column.Precision.Value > 0)
            {
                int scale = column.Scale ?? 0;
                int maxIntegerDigits = column.Precision.Value - scale;
                var absVal = Math.Abs(dVal);
                var truncated = Math.Truncate(absVal);
                var intDigits = truncated == 0 ? 0 : truncated.ToString(CultureInfo.InvariantCulture).Length;
                if (intDigits > maxIntegerDigits)
                {
                    throw new DynamicCrudException(
                        "DECIMAL_OUT_OF_RANGE",
                        $"Value '{unwrapped}' for column '{column.Name}' exceeds the maximum allowed integer digits of {maxIntegerDigits} (definition: decimal({column.Precision},{scale})).",
                        HttpStatusCode.BadRequest);
                }
            }
            return dVal;
        }

        if (normalizedType is "float" or "real")
        {
            if (unwrapped is double dVal) return dVal;
            if (double.TryParse(unwrapped.ToString(), NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed))
            {
                return parsed;
            }
            throw new DynamicCrudException("INVALID_DATA_TYPE", $"Cannot convert '{unwrapped}' to float for column '{column.Name}'.");
        }

        // 4. Booleans (bit)
        if (normalizedType is "bit")
        {
            if (unwrapped is bool b) return b;
            var strBool = unwrapped.ToString()?.Trim().ToLowerInvariant();
            if (strBool is "true" or "1" or "yes" or "on") return true;
            if (strBool is "false" or "0" or "no" or "off") return false;
            throw new DynamicCrudException("INVALID_DATA_TYPE", $"Cannot convert '{unwrapped}' to bit (boolean) for column '{column.Name}'.");
        }

        // 5. UniqueIdentifier (GUID)
        if (normalizedType is "uniqueidentifier")
        {
            if (unwrapped is Guid g) return g;
            if (Guid.TryParse(unwrapped.ToString(), out var parsedGuid))
            {
                return parsedGuid;
            }
            throw new DynamicCrudException("INVALID_DATA_TYPE", $"Cannot convert '{unwrapped}' to Guid for column '{column.Name}'.");
        }

        // 6. Dates & Times
        if (normalizedType is "date" or "datetime" or "datetime2" or "smalldatetime")
        {
            if (unwrapped is DateTime dt) return dt;
            if (DateTime.TryParse(unwrapped.ToString(), CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var parsedDt))
            {
                return parsedDt;
            }
            if (DateTime.TryParse(unwrapped.ToString(), out var fallbackDt))
            {
                return fallbackDt;
            }
            throw new DynamicCrudException("INVALID_DATA_TYPE", $"Cannot convert '{unwrapped}' to DateTime for column '{column.Name}'.");
        }

        if (normalizedType is "time")
        {
            if (unwrapped is TimeSpan ts) return ts;
            if (TimeSpan.TryParse(unwrapped.ToString(), CultureInfo.InvariantCulture, out var parsedTs))
            {
                return parsedTs;
            }
            throw new DynamicCrudException("INVALID_DATA_TYPE", $"Cannot convert '{unwrapped}' to TimeSpan for column '{column.Name}'.");
        }

        // 7. Binary & RowVersion
        if (normalizedType is "varbinary" or "binary" or "image" or "rowversion" or "timestamp")
        {
            if (unwrapped is byte[] bytes) return bytes;
            if (unwrapped is string b64)
            {
                try
                {
                    return Convert.FromBase64String(b64);
                }
                catch
                {
                    // Fallback to UTF8 bytes if not valid base64
                    return System.Text.Encoding.UTF8.GetBytes(b64);
                }
            }
        }

        return unwrapped;
    }

    public Dictionary<string, object?> PrepareWritableValues(
        IDictionary<string, object?> inputValues,
        IReadOnlyList<ColumnItem> columns,
        bool isInsert)
    {
        var result = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
        var colMap = columns.ToDictionary(c => c.Name, StringComparer.OrdinalIgnoreCase);

        // Validate that all input columns exist in table metadata
        foreach (var key in inputValues.Keys)
        {
            if (!colMap.ContainsKey(key))
            {
                throw new DynamicCrudException(
                    "INVALID_COLUMN",
                    $"Column '{key}' does not exist on table.",
                    HttpStatusCode.BadRequest);
            }
        }

        // In Update mode, Primary Key cannot be modified
        if (!isInsert)
        {
            foreach (var pk in columns.Where(c => c.IsPrimaryKey))
            {
                if (inputValues.ContainsKey(pk.Name))
                {
                    throw new DynamicCrudException(
                        "PRIMARY_KEY_READONLY",
                        $"Primary Key column '{pk.Name}' cannot be updated.",
                        HttpStatusCode.BadRequest);
                }
            }
        }

        foreach (var col in columns)
        {
            // Omit protected columns
            if (col.IsIdentity || col.IsComputed || col.IsRowVersion)
            {
                continue;
            }

            // For UPDATE, Primary Keys are handled in WHERE clause, not SET clause
            if (!isInsert && col.IsPrimaryKey)
            {
                continue;
            }

            var hasInput = inputValues.TryGetValue(col.Name, out var rawVal);

            if (isInsert)
            {
                // If column has default constraint and user did not supply a value (or supplied null/empty on non-nullable),
                // omit it from INSERT so SQL Server default applies!
                if (col.HasDefault && (!hasInput || rawVal == null || (rawVal is string s && string.IsNullOrEmpty(s))))
                {
                    continue;
                }

                if (!hasInput)
                {
                    if (!col.Nullable && !col.HasDefault)
                    {
                        throw new DynamicCrudException(
                            "REQUIRED_FIELD_MISSING",
                            $"Required column '{col.Name}' was not provided.",
                            HttpStatusCode.BadRequest);
                    }
                    continue;
                }
            }
            else
            {
                // For UPDATE, only process columns that are explicitly provided
                if (!hasInput)
                {
                    continue;
                }
            }

            var converted = ConvertAndValidate(rawVal, col, isRequired: isInsert && !col.Nullable && !col.HasDefault);
            result[col.Name] = converted;
        }

        if (!isInsert && result.Count == 0)
        {
            throw new DynamicCrudException(
                "NO_FIELDS_TO_UPDATE",
                "No valid writable columns were provided for update.",
                HttpStatusCode.BadRequest);
        }

        return result;
    }

    public bool AreValuesEqual(object? val1, object? val2)
    {
        if (val1 == null || val1 is DBNull)
            return val2 == null || val2 is DBNull;
        if (val2 == null || val2 is DBNull)
            return false;

        if (val1 is string s1 && val2 is string s2)
            return string.Equals(s1.Trim(), s2.Trim(), StringComparison.Ordinal);

        if (val1 is bool b1 && val2 is bool b2)
            return b1 == b2;

        if (val1 is DateTime dt1 && val2 is DateTime dt2)
            return Math.Abs((dt1 - dt2).TotalMilliseconds) < 1000;

        if (decimal.TryParse(val1.ToString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var d1) &&
            decimal.TryParse(val2.ToString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var d2))
        {
            return d1 == d2;
        }

        return string.Equals(val1.ToString(), val2.ToString(), StringComparison.Ordinal);
    }

    public Dictionary<string, object?> PrepareKeyValues(
        IDictionary<string, object?> inputKeys,
        IReadOnlyList<ColumnItem> columns)
    {
        var pkCols = columns.Where(c => c.IsPrimaryKey).ToList();
        if (pkCols.Count == 0)
        {
            throw new DynamicCrudException(
                "MISSING_PRIMARY_KEY",
                "Cannot perform operation because the table does not have a defined Primary Key.",
                HttpStatusCode.BadRequest);
        }

        var result = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

        foreach (var pk in pkCols)
        {
            if (!inputKeys.TryGetValue(pk.Name, out var rawVal) || rawVal == null)
            {
                throw new DynamicCrudException(
                    "MISSING_KEY_VALUE",
                    $"Primary key value for column '{pk.Name}' is required.",
                    HttpStatusCode.BadRequest);
            }

            var converted = ConvertAndValidate(rawVal, pk, isRequired: true);
            result[pk.Name] = converted;
        }

        return result;
    }

    private static bool IsStringType(string dataType)
    {
        return dataType.Contains("char", StringComparison.OrdinalIgnoreCase) ||
               dataType.Contains("text", StringComparison.OrdinalIgnoreCase);
    }

    private static object? UnwrapRawValue(object? value)
    {
        if (value is JsonElement jsonElem)
        {
            return jsonElem.ValueKind switch
            {
                JsonValueKind.String => jsonElem.GetString(),
                JsonValueKind.Number => jsonElem.TryGetInt64(out var l) ? l : jsonElem.GetDouble(),
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                JsonValueKind.Null => null,
                _ => jsonElem.ToString()
            };
        }
        return value;
    }
}
