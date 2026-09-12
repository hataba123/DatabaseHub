using System.Globalization;
using System.Net;
using DBHub.Api.DTOs;
using DBHub.Api.Infrastructure;
using DBHub.Api.Models;
using DBHub.Api.Services.Crud;
using Xunit;

namespace DBHub.Tests;

public class DynamicCrudTests
{
    private readonly DynamicCrudSqlBuilder _sqlBuilder = new();
    private readonly SqlValueConverter _valueConverter = new();

    [Fact]
    public void BuildSelectByKeysSql_GeneratesProperlyQuotedParameterizedQuery()
    {
        var sql = _sqlBuilder.BuildSelectByKeysSql("dbo", "Users", new[] { "Id" });
        Assert.Equal("SELECT * FROM [dbo].[Users] WHERE [Id] = @key_Id;", sql);
    }

    [Fact]
    public void BuildSelectByKeysSql_CompositeKeys_GeneratesAllKeyConditions()
    {
        var sql = _sqlBuilder.BuildSelectByKeysSql("sales", "OrderDetails", new[] { "OrderId", "ItemId" });
        Assert.Equal("SELECT * FROM [sales].[OrderDetails] WHERE [OrderId] = @key_OrderId AND [ItemId] = @key_ItemId;", sql);
    }

    [Fact]
    public void BuildInsertSql_WithColumns_GeneratesQuotedColumnsAndValues()
    {
        var sql = _sqlBuilder.BuildInsertSql("dbo", "Employees", new[] { "Name", "Salary" }, hasIdentity: false);
        Assert.Equal("INSERT INTO [dbo].[Employees] ([Name], [Salary]) VALUES (@val_Name, @val_Salary);", sql);
    }

    [Fact]
    public void BuildInsertSql_WithIdentity_IncludesScopeIdentity()
    {
        var sql = _sqlBuilder.BuildInsertSql("dbo", "Employees", new[] { "Name" }, hasIdentity: true);
        Assert.Equal("INSERT INTO [dbo].[Employees] ([Name]) VALUES (@val_Name); SELECT SCOPE_IDENTITY() AS [NewIdentityId];", sql);
    }

    [Fact]
    public void BuildUpdateSql_WithoutRowVersion_GeneratesStandardUpdate()
    {
        var sql = _sqlBuilder.BuildUpdateSql("dbo", "Products", new[] { "Price", "Stock" }, new[] { "Id" });
        Assert.Equal("UPDATE [dbo].[Products] SET [Price] = @val_Price, [Stock] = @val_Stock WHERE [Id] = @key_Id;", sql);
    }

    [Fact]
    public void BuildUpdateSql_WithRowVersion_IncludesOptimisticConcurrencyCondition()
    {
        var sql = _sqlBuilder.BuildUpdateSql("dbo", "Products", new[] { "Price" }, new[] { "Id" }, "RowVer");
        Assert.Equal("UPDATE [dbo].[Products] SET [Price] = @val_Price WHERE [Id] = @key_Id AND [RowVer] = @rv_match;", sql);
    }

    [Fact]
    public void BuildDeleteSql_GeneratesQuotedWhereClause()
    {
        var sql = _sqlBuilder.BuildDeleteSql("dbo", "Customers", new[] { "CustomerId" });
        Assert.Equal("DELETE FROM [dbo].[Customers] WHERE [CustomerId] = @key_CustomerId;", sql);
    }

    [Fact]
    public void BuildLookupSql_GeneratesDistinctTopSql()
    {
        var sql = _sqlBuilder.BuildLookupSql("dbo", "Departments", "DeptName", top: 20);
        Assert.Equal("SELECT DISTINCT TOP 20 [DeptName] AS [Value], CAST([DeptName] AS NVARCHAR(250)) AS [Label] FROM [dbo].[Departments] WHERE [DeptName] IS NOT NULL ORDER BY [Label];", sql);
    }

    [Fact]
    public void ConvertAndValidate_StringWithinMaxLength_ReturnsString()
    {
        var col = new ColumnItem { Name = "Title", DataType = "nvarchar", MaxLength = 50, Nullable = false };
        var result = _valueConverter.ConvertAndValidate("Hello World", col, isRequired: true);
        Assert.Equal("Hello World", result);
    }

    [Fact]
    public void ConvertAndValidate_StringExceedingMaxLength_ThrowsDataTooLong()
    {
        var col = new ColumnItem { Name = "Code", DataType = "varchar", MaxLength = 5, Nullable = false };
        var ex = Assert.Throws<DynamicCrudException>(() =>
            _valueConverter.ConvertAndValidate("1234567", col, isRequired: true));

        Assert.Equal("DATA_TOO_LONG", ex.ErrorCode);
        Assert.Equal(HttpStatusCode.BadRequest, ex.StatusCode);
    }

    [Fact]
    public void ConvertAndValidate_RequiredNull_ThrowsNullNotAllowed()
    {
        var col = new ColumnItem { Name = "Email", DataType = "nvarchar", MaxLength = 100, Nullable = false, HasDefault = false, IsIdentity = false };
        var ex = Assert.Throws<DynamicCrudException>(() =>
            _valueConverter.ConvertAndValidate(null, col, isRequired: true));

        Assert.Equal("NULL_NOT_ALLOWED", ex.ErrorCode);
    }

    [Fact]
    public void ConvertAndValidate_IntegerParsing_SucceedsForNumericString()
    {
        var col = new ColumnItem { Name = "Age", DataType = "int", Nullable = true };
        var result = _valueConverter.ConvertAndValidate("42", col);
        Assert.Equal(42, result);
    }

    [Fact]
    public void ConvertAndValidate_DecimalParsing_SucceedsForDecimal()
    {
        var col = new ColumnItem { Name = "Salary", DataType = "decimal", Nullable = true };
        var result = _valueConverter.ConvertAndValidate("1500.50", col);
        Assert.Equal(1500.50m, result);
    }

    [Fact]
    public void ConvertAndValidate_BitParsing_HandlesTrueFalseVariants()
    {
        var col = new ColumnItem { Name = "IsActive", DataType = "bit", Nullable = false };
        Assert.Equal(true, _valueConverter.ConvertAndValidate("true", col));
        Assert.Equal(true, _valueConverter.ConvertAndValidate("1", col));
        Assert.Equal(false, _valueConverter.ConvertAndValidate("false", col));
        Assert.Equal(false, _valueConverter.ConvertAndValidate("0", col));
    }

    [Fact]
    public void ConvertAndValidate_GuidParsing_Succeeds()
    {
        var col = new ColumnItem { Name = "Uid", DataType = "uniqueidentifier", Nullable = false };
        var guidStr = Guid.NewGuid().ToString();
        var result = _valueConverter.ConvertAndValidate(guidStr, col);
        Assert.IsType<Guid>(result);
        Assert.Equal(guidStr, result.ToString());
    }

    [Fact]
    public void PrepareWritableValues_Insert_OmitsProtectedColumnsAndAppliesDefaults()
    {
        var columns = new List<ColumnItem>
        {
            new() { Name = "Id", DataType = "int", IsPrimaryKey = true, IsIdentity = true },
            new() { Name = "Name", DataType = "nvarchar", MaxLength = 50, Nullable = false },
            new() { Name = "CreatedAt", DataType = "datetime", Nullable = false, HasDefault = true },
            new() { Name = "FullNameComputed", DataType = "nvarchar", IsComputed = true },
            new() { Name = "RowVer", DataType = "rowversion", IsRowVersion = true }
        };

        var input = new Dictionary<string, object?>
        {
            { "Id", 999 }, // Should be omitted because identity
            { "Name", "Alice" },
            { "CreatedAt", null }, // Should be omitted because HasDefault
            { "FullNameComputed", "ComputedValue" }, // Should be omitted because computed
            { "RowVer", "somebytes" } // Should be omitted because rowversion
        };

        var prepared = _valueConverter.PrepareWritableValues(input, columns, isInsert: true);

        Assert.Single(prepared);
        Assert.True(prepared.ContainsKey("Name"));
        Assert.Equal("Alice", prepared["Name"]);
        Assert.False(prepared.ContainsKey("Id"));
        Assert.False(prepared.ContainsKey("CreatedAt"));
        Assert.False(prepared.ContainsKey("FullNameComputed"));
        Assert.False(prepared.ContainsKey("RowVer"));
    }

    [Fact]
    public void PrepareKeyValues_ThrowsIfNoPrimaryKeyDefined()
    {
        var columns = new List<ColumnItem>
        {
            new() { Name = "ColA", DataType = "nvarchar", IsPrimaryKey = false }
        };

        var input = new Dictionary<string, object?> { { "ColA", "test" } };
        var ex = Assert.Throws<DynamicCrudException>(() =>
            _valueConverter.PrepareKeyValues(input, columns));

        Assert.Equal("MISSING_PRIMARY_KEY", ex.ErrorCode);
    }

    [Fact]
    public void PrepareKeyValues_ThrowsIfKeyValueMissing()
    {
        var columns = new List<ColumnItem>
        {
            new() { Name = "Id", DataType = "int", IsPrimaryKey = true }
        };

        var input = new Dictionary<string, object?>();
        var ex = Assert.Throws<DynamicCrudException>(() =>
            _valueConverter.PrepareKeyValues(input, columns));

        Assert.Equal("MISSING_KEY_VALUE", ex.ErrorCode);
    }
}
