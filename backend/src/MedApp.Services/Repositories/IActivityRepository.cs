using MedApp.Models.Models;

namespace MedApp.Services.Repositories;

public interface IActivityRepository
{
    Task<Activity?> GetByIdAsync(Guid id, CancellationToken ct = default);

    Task<IEnumerable<Activity>> GetBySubjectIdAsync(Guid subjectId, CancellationToken ct = default);

    Task<IEnumerable<Activity>> GetAllAsync(CancellationToken ct = default);

    Task AddAsync(Activity activity, CancellationToken ct = default);

    Task UpdateAsync(Activity activity, CancellationToken ct = default);

    Task DeleteAsync(Guid id, CancellationToken ct = default);
}

