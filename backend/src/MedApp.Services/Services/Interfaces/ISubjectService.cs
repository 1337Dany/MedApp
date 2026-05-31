using MedApp.Models.Models;

namespace MedApp.Services.Services;

public interface ISubjectService
{
    Task<Subject?> GetByIdAsync(Guid subjectId, CancellationToken ct = default);
    Task<IEnumerable<Subject>> GetByUserIdAsync(Guid userId, CancellationToken ct = default);
    Task<IEnumerable<Subject>> GetAllAsync(CancellationToken ct = default);
    Task<Subject> AddAsync(Subject subject, CancellationToken ct = default);
    Task UpdateAsync(Subject subject, CancellationToken ct = default);
    Task DeleteAsync(Guid subjectId, CancellationToken ct = default);
}

