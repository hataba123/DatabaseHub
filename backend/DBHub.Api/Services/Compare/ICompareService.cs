using DBHub.Api.DTOs;
using DBHub.Api.Models.Compare;

namespace DBHub.Api.Services.Compare;

public interface ICompareService
{
    Task<CompareSessionDto> CreateCompareSessionAsync(
        CreateCompareSessionRequest request,
        string? userId = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CompareSessionDto>> GetCompareSessionsAsync(
        CancellationToken cancellationToken = default);

    Task<CompareSessionDto?> GetCompareSessionByIdAsync(
        string id,
        CancellationToken cancellationToken = default);
}
