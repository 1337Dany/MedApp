using MedApp.Services.DTOs.Analytics;

namespace MedApp.Services.Services;

public interface ITeacherAnalyticsService
{
    Task<ClassAnalyticsDto> GetClassAnalyticsAsync(CancellationToken ct = default);
}
