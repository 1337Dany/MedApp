using MedApp.Models.Models;

namespace MedApp.Services.Services;

public interface IStudyStrategyService
{
    Task<StudyStrategy?> GetByIdAsync(int methodId, CancellationToken ct = default);
    Task<IEnumerable<StudyStrategy>> GetAllAsync(CancellationToken ct = default);
    Task<StudyStrategy> AddAsync(StudyStrategy strategy, CancellationToken ct = default);
    Task UpdateAsync(StudyStrategy strategy, CancellationToken ct = default);
    Task DeleteAsync(int methodId, CancellationToken ct = default);
}

