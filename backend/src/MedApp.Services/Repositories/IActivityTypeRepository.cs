using MedApp.Models.Models;

namespace MedApp.Services.Repositories;

// Lookup table seeded by migrations; read-only at runtime.
public interface IActivityTypeRepository
{
    Task<IEnumerable<ActivityType>> GetAllAsync(CancellationToken ct = default);

    Task<bool> ExistsAsync(int id, CancellationToken ct = default);
}
