using MedApp.Services.DTOs.Planning;

namespace MedApp.Services.Services;

public interface IPlanningService
{
    // Replaces the caller's future auto-planned sessions with a new plan. Null if the user does not exist.
    Task<PlanResultDto?> GenerateAsync(Guid userId, PlanRequest request, CancellationToken ct = default);

    Task<IEnumerable<PlanningWarningDto>> GetWarningsAsync(Guid userId, string? timeZone, int? days, CancellationToken ct = default);

    // Re-plans only when the user already has a plan (future auto-planned sessions).
    Task ReplanIfActiveAsync(Guid userId, CancellationToken ct = default);
}
