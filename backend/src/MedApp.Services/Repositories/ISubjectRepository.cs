using MedApp.Models.Models;

namespace MedApp.Services.Repositories;

// Every lookup is scoped to the owning user: another user's row behaves as if it did not exist.
public interface ISubjectRepository
{
    Task<Subject?> GetByIdAsync(Guid id, Guid userId, CancellationToken ct = default);

    Task<IEnumerable<Subject>> GetByUserIdAsync(Guid userId, CancellationToken ct = default);

    // Read-only, for aggregated analytics over several users.
    Task<List<Subject>> GetByUserIdsAsync(IReadOnlyCollection<Guid> userIds, CancellationToken ct = default);

    Task<bool> ExistsAsync(Guid id, Guid userId, CancellationToken ct = default);

    Task AddAsync(Subject subject, CancellationToken ct = default);

    Task DeleteAsync(Subject subject, CancellationToken ct = default);
}
