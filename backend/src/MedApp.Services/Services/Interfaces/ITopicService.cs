using MedApp.Models.Models;

namespace MedApp.Services.Services;

public interface ITopicService
{
    Task<Topic?> GetByIdAsync(Guid topicId, CancellationToken ct = default);
    Task<IEnumerable<Topic>> GetBySubjectIdAsync(Guid subjectId, CancellationToken ct = default);
    Task<IEnumerable<Topic>> GetAllAsync(CancellationToken ct = default);
    Task<Topic> AddAsync(Topic topic, CancellationToken ct = default);
    Task UpdateAsync(Topic topic, CancellationToken ct = default);
    Task DeleteAsync(Guid topicId, CancellationToken ct = default);
    Task DeleteBySubjectIdAsync(Guid subjectId, CancellationToken ct = default);
}

