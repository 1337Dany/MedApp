using AutoMapper;
using MedApp.Models.Models;
using MedApp.Services.DTOs.Topics;
using MedApp.Services.Planning;
using MedApp.Services.Repositories;

namespace MedApp.Services.Services;

public class TopicService : ITopicService
{
    private readonly ITopicRepository _repository;
    private readonly ISubjectRepository _subjects;
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;
    private readonly IPlanningService _planning;

    public TopicService(ITopicRepository repository, ISubjectRepository subjects, IUnitOfWork uow, IMapper mapper,
        IPlanningService planning)
    {
        _repository = repository;
        _subjects = subjects;
        _uow = uow;
        _mapper = mapper;
        _planning = planning;
    }

    public async Task<IEnumerable<TopicDto>> GetAllAsync(Guid userId, Guid? subjectId = null, CancellationToken ct = default)
    {
        var topics = await _repository.GetByUserIdAsync(userId, subjectId, ct);
        return _mapper.Map<IEnumerable<TopicDto>>(topics);
    }

    public async Task<TopicDto?> GetByIdAsync(Guid topicId, Guid userId, CancellationToken ct = default)
    {
        var topic = await _repository.GetByIdAsync(topicId, userId, ct);
        return topic is null ? null : _mapper.Map<TopicDto>(topic);
    }

    public async Task<TopicDto?> CreateAsync(Guid subjectId, Guid userId, TopicRequest request, CancellationToken ct = default)
    {
        if (!await _subjects.ExistsAsync(subjectId, userId, ct))
        {
            return null;
        }

        var topic = _mapper.Map<Topic>(request);
        topic.SubjectId = subjectId;
        topic.Order = request.Order ?? (await _repository.GetMaxOrderAsync(subjectId, ct) ?? -1) + 1;

        await _repository.AddAsync(topic, ct);
        await _uow.SaveChangesAsync(ct);
        await _planning.ReplanIfActiveAsync(userId, ct);
        return _mapper.Map<TopicDto>(topic);
    }

    public async Task<TopicDto?> UpdateAsync(Guid topicId, Guid userId, TopicRequest request, CancellationToken ct = default)
    {
        var topic = await _repository.GetByIdAsync(topicId, userId, ct);
        if (topic is null)
        {
            return null;
        }

        var previousFeedback = topic.Feedback;
        _mapper.Map(request, topic);
        if (request.Order is not null)
        {
            topic.Order = request.Order.Value;
        }

        // A new rating is a review of the topic (docs/PLANNING.md, "Spaced repetition").
        var reviewed = topic.Feedback != previousFeedback;
        if (reviewed)
        {
            SpacedRepetition.Review(topic, topic.Feedback, DateTime.UtcNow);
        }

        await _uow.SaveChangesAsync(ct);
        if (reviewed)
        {
            await _planning.ReplanIfActiveAsync(userId, ct);
        }
        return _mapper.Map<TopicDto>(topic);
    }

    public async Task<bool> DeleteAsync(Guid topicId, Guid userId, CancellationToken ct = default)
    {
        var topic = await _repository.GetByIdAsync(topicId, userId, ct);
        if (topic is null)
        {
            return false;
        }

        // Activities linked to the topic keep existing; their TopicId is cleared by the database.
        await _repository.DeleteAsync(topic, ct);
        await _uow.SaveChangesAsync(ct);
        await _planning.ReplanIfActiveAsync(userId, ct);
        return true;
    }
}
