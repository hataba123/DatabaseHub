using DBHub.Api.Infrastructure;
using Xunit;

namespace DBHub.Tests;

public class SqlIdentifierValidatorTests
{
    [Theory]
    [InlineData("NhanVien")]
    [InlineData("dbo")]
    [InlineData("HQ_Size")]
    [InlineData("HQ_PhieuCan")]
    [InlineData("TableName123")]
    [InlineData("_PrivateTable")]
    [InlineData("@paramVar")]
    [InlineData("#tempTable")]
    public void IsValidIdentifier_ValidInputs_ReturnsTrue(string identifier)
    {
        var result = SqlIdentifierValidator.IsValidIdentifier(identifier);
        Assert.True(result);
    }

    [Theory]
    [InlineData("NhanVien; DROP TABLE Users")]
    [InlineData("Users; DELETE FROM Users--")]
    [InlineData("Table/*comment*/")]
    [InlineData("Table' OR '1'='1")]
    [InlineData("Table\"")]
    [InlineData("Table Name With Spaces")]
    [InlineData("123StartWithNumber")]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void IsValidIdentifier_MaliciousOrInvalidInputs_ReturnsFalse(string? identifier)
    {
        var result = SqlIdentifierValidator.IsValidIdentifier(identifier);
        Assert.False(result);
    }

    [Fact]
    public void ValidateAndQuote_ValidIdentifier_ReturnsQuotedBracket()
    {
        var result = SqlIdentifierValidator.ValidateAndQuote("NhanVienDaiThanh");
        Assert.Equal("[NhanVienDaiThanh]", result);
    }

    [Theory]
    [InlineData("NhanVien; DROP TABLE Users")]
    [InlineData("Name DESC; DROP TABLE Users")]
    [InlineData("Table'")]
    public void ValidateAndQuote_MaliciousIdentifier_ThrowsArgumentException(string maliciousInput)
    {
        Assert.Throws<ArgumentException>(() =>
            SqlIdentifierValidator.ValidateAndQuote(maliciousInput));
    }

    [Theory]
    [InlineData("asc", "ASC")]
    [InlineData("ASC", "ASC")]
    [InlineData("ascend", "ASC")]
    [InlineData("desc", "DESC")]
    [InlineData("DESC", "DESC")]
    [InlineData("descend", "DESC")]
    [InlineData(null, "ASC")]
    [InlineData("", "ASC")]
    public void ValidateSortDirection_ValidInputs_ReturnsNormalizedDirection(string? input, string expected)
    {
        var result = SqlIdentifierValidator.ValidateSortDirection(input);
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("ASC; DROP TABLE Users")]
    [InlineData("DESC; SELECT 1")]
    [InlineData("INVALID")]
    public void ValidateSortDirection_MaliciousInputs_ThrowsArgumentException(string maliciousInput)
    {
        Assert.Throws<ArgumentException>(() =>
            SqlIdentifierValidator.ValidateSortDirection(maliciousInput));
    }

    [Theory]
    [InlineData(-10, 50)]
    [InlineData(0, 50)]
    [InlineData(25, 25)]
    [InlineData(100, 100)]
    [InlineData(500, 500)]
    [InlineData(999999, 500)]
    [InlineData(1000000, 500)]
    public void SanitizePageSize_ClampsCorrectly(int input, int expected)
    {
        var result = SqlIdentifierValidator.SanitizePageSize(input, defaultSize: 50, maxSize: 500);
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData(-5, 1)]
    [InlineData(0, 1)]
    [InlineData(1, 1)]
    [InlineData(5, 5)]
    public void SanitizePage_NeverLessThanOne(int input, int expected)
    {
        var result = SqlIdentifierValidator.SanitizePage(input);
        Assert.Equal(expected, result);
    }
}
