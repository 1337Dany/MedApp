using MedApp.Models.Models;
using MedApp.Models.Models.Enums;

namespace MedApp.Services.Services;

public interface IActivityService
{
    Task<Activity?> GetByIdAsync(Guid activityId, CancellationToken ct = default);
    Task<IEnumerable<Activity>> GetBySubjectIdAsync(Guid subjectId, CancellationToken ct = default);
    Task<IEnumerable<Activity>> GetByStatusAsync(Status status, CancellationToken ct = default);
    Task<IEnumerable<Activity>> GetAllAsync(CancellationToken ct = default);
    Task<Activity> AddAsync(Activity activity, CancellationToken ct = default);
    Task UpdateAsync(Activity activity, CancellationToken ct = default);
    Task DeleteAsync(Guid activityId, CancellationToken ct = default);
    Task DeleteBySubjectIdAsync(Guid subjectId, CancellationToken ct = default);
}

