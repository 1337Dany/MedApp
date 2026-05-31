using MedApp.Models.Models;

namespace MedApp.Services.Repositories;

public interface IActivityTypeRepository
{
    Task<ActivityType?> GetByIdAsync(int id, CancellationToken ct = default);

    Task<IEnumerable<ActivityType>> GetAllAsync(CancellationToken ct = default);

    Task AddAsync(ActivityType type, CancellationToken ct = default);

    Task UpdateAsync(ActivityType type, CancellationToken ct = default);

    Task DeleteAsync(int id, CancellationToken ct = default);
}

