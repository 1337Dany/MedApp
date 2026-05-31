using MedApp.Models.Models;

namespace MedApp.Services.Repositories;

public interface IStudyStrategyRepository
{
    Task<StudyStrategy?> GetByIdAsync(int id, CancellationToken ct = default);

    Task<IEnumerable<StudyStrategy>> GetAllAsync(CancellationToken ct = default);

    Task AddAsync(StudyStrategy strategy, CancellationToken ct = default);

    Task UpdateAsync(StudyStrategy strategy, CancellationToken ct = default);

    Task DeleteAsync(int id, CancellationToken ct = default);
}

