using MedApp.Models.Models;

namespace MedApp.Services.Repositories;

// Topics are owned through their subject (Topic.Subject.UserId).
public interface ITopicRepository
{
    Task<Topic?> GetByIdAsync(Guid id, Guid userId, CancellationToken ct = default);

    Task<IEnumerable<Topic>> GetByUserIdAsync(Guid userId, Guid? subjectId = null, CancellationToken ct = default);

    Task<int?> GetMaxOrderAsync(Guid subjectId, CancellationToken ct = default);

    Task AddAsync(Topic topic, CancellationToken ct = default);

    Task DeleteAsync(Topic topic, CancellationToken ct = default);
}
