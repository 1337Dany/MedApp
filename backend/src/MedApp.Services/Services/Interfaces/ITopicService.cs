using MedApp.Services.DTOs.Topics;

namespace MedApp.Services.Services;

// Every method is scoped to the caller (userId from the token). Null / false means "not found or not yours".
public interface ITopicService
{
    Task<IEnumerable<TopicDto>> GetAllAsync(Guid userId, Guid? subjectId = null, CancellationToken ct = default);
    Task<TopicDto?> GetByIdAsync(Guid topicId, Guid userId, CancellationToken ct = default);
    Task<TopicDto?> CreateAsync(Guid subjectId, Guid userId, TopicRequest request, CancellationToken ct = default);
    Task<TopicDto?> UpdateAsync(Guid topicId, Guid userId, TopicRequest request, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid topicId, Guid userId, CancellationToken ct = default);
}
