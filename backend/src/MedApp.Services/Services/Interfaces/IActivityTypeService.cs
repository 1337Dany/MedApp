using MedApp.Models.Models;

namespace MedApp.Services.Services;

public interface IActivityTypeService
{
    Task<ActivityType?> GetByIdAsync(int typeId, CancellationToken ct = default);
    Task<IEnumerable<ActivityType>> GetAllAsync(CancellationToken ct = default);
    Task<ActivityType> AddAsync(ActivityType activityType, CancellationToken ct = default);
    Task UpdateAsync(ActivityType activityType, CancellationToken ct = default);
    Task DeleteAsync(int typeId, CancellationToken ct = default);
}

