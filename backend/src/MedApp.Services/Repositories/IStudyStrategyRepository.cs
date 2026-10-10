using MedApp.Models.Models;

namespace MedApp.Services.Repositories;

// Lookup table seeded by migrations; read-only at runtime.
public interface IStudyStrategyRepository
{
    Task<IEnumerable<StudyStrategy>> GetAllAsync(CancellationToken ct = default);

    Task<bool> ExistsAsync(int id, CancellationToken ct = default);
}
