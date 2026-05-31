using MedApp.Models.Models;

namespace MedApp.Services.Repositories;

public interface ISubjectRepository
{
    Task<Subject?> GetByIdAsync(Guid id, CancellationToken ct = default);

    Task<IEnumerable<Subject>> GetByUserIdAsync(Guid userId, CancellationToken ct = default);

    Task<IEnumerable<Subject>> GetAllAsync(CancellationToken ct = default);

    Task AddAsync(Subject subject, CancellationToken ct = default);

    Task UpdateAsync(Subject subject, CancellationToken ct = default);

    Task DeleteAsync(Guid id, CancellationToken ct = default);
}

