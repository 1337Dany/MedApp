using MedApp.Models.Models;
using MedApp.Services.Repositories;

namespace MedApp.Services.Services;

public class TopicService : ITopicService
{
    private readonly ITopicRepository _repository;
    private readonly IUnitOfWork _uow;

    public TopicService(ITopicRepository repository, IUnitOfWork uow)
    {
        _repository = repository;
        _uow = uow;
    }

    public async Task<Topic?> GetByIdAsync(Guid topicId, CancellationToken ct = default)
    {
        return await _repository.GetByIdAsync(topicId, ct);
    }

    public async Task<IEnumerable<Topic>> GetBySubjectIdAsync(Guid subjectId, CancellationToken ct = default)
    {
        return await _repository.GetBySubjectIdAsync(subjectId, ct);
    }

    public async Task<IEnumerable<Topic>> GetAllAsync(CancellationToken ct = default)
    {
        return await _repository.GetAllAsync(ct);
    }

    public async Task<Topic> AddAsync(Topic topic, CancellationToken ct = default)
    {
        topic.TopicId = Guid.NewGuid();
        await _repository.AddAsync(topic, ct);
        await _uow.SaveChangesAsync(ct);
        return topic;
    }

    public async Task UpdateAsync(Topic topic, CancellationToken ct = default)
    {
        await _repository.UpdateAsync(topic, ct);
        await _uow.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(Guid topicId, CancellationToken ct = default)
    {
        await _repository.DeleteAsync(topicId, ct);
        await _uow.SaveChangesAsync(ct);
    }

    public async Task DeleteBySubjectIdAsync(Guid subjectId, CancellationToken ct = default)
    {
        var topics = await _repository.GetBySubjectIdAsync(subjectId, ct);
        foreach (var topic in topics)
        {
            await _repository.DeleteAsync(topic.TopicId, ct);
        }
        await _uow.SaveChangesAsync(ct);
    }
}

