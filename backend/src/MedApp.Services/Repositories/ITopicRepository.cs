using MedApp.Models.Models;

namespace MedApp.Services.Repositories;

public interface ITopicRepository
{
    Task<Topic?> GetByIdAsync(Guid id, CancellationToken ct = default);

    Task<IEnumerable<Topic>> GetBySubjectIdAsync(Guid subjectId, CancellationToken ct = default);

    Task<IEnumerable<Topic>> GetAllAsync(CancellationToken ct = default);

    Task AddAsync(Topic topic, CancellationToken ct = default);

    Task UpdateAsync(Topic topic, CancellationToken ct = default);

    Task DeleteAsync(Guid id, CancellationToken ct = default);
}

