using AutoMapper;
using MedApp.Models.Models;
using MedApp.Models.Models.Enums;
using MedApp.Services.DTOs.Activities;
using MedApp.Services.Planning;
using MedApp.Services.Repositories;

namespace MedApp.Services.Services;

public class ActivityService : IActivityService
{
    private readonly IActivityRepository _repository;
    private readonly IRecurringOptionsRepository _recurringOptions;
    private readonly ISubjectRepository _subjects;
    private readonly ITopicRepository _topics;
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;
    private readonly IPlanningService _planning;

    public ActivityService(
        IActivityRepository repository,
        IRecurringOptionsRepository recurringOptions,
        ISubjectRepository subjects,
        ITopicRepository topics,
        IUnitOfWork uow,
        IMapper mapper,
        IPlanningService planning)
    {
        _repository = repository;
        _recurringOptions = recurringOptions;
        _subjects = subjects;
        _topics = topics;
        _uow = uow;
        _mapper = mapper;
        _planning = planning;
    }

    public async Task<IEnumerable<ActivityDto>> GetAllAsync(Guid userId, DateTime? from = null, DateTime? to = null,
        CancellationToken ct = default)
    {
        var activities = await _repository.GetByUserIdAsync(userId, ToUtc(from), ToUtc(to), ct);
        return _mapper.Map<IEnumerable<ActivityDto>>(activities);
    }

    public async Task<ActivityDto?> GetByIdAsync(Guid activityId, Guid userId, CancellationToken ct = default)
    {
        var activity = await _repository.GetByIdAsync(activityId, userId, ct);
        return activity is null ? null : _mapper.Map<ActivityDto>(activity);
    }

    public async Task<ServiceResult<ActivityDto>> CreateAsync(Guid userId, ActivityRequest request, CancellationToken ct = default)
    {
        var references = await ResolveReferencesAsync(userId, request, ct);
        if (!references.Succeeded)
        {
            return ServiceResult<ActivityDto>.Failure(references.Error, references.ErrorMessage!);
        }

        var activity = _mapper.Map<Activity>(request);
        activity.UserId = userId;
        Apply(activity, request, references.Value);

        await _repository.AddAsync(activity, ct);
        await _uow.SaveChangesAsync(ct);
        return ServiceResult<ActivityDto>.Success(_mapper.Map<ActivityDto>(activity));
    }

    public async Task<ServiceResult<ActivityDto>> UpdateAsync(Guid activityId, Guid userId, ActivityRequest request,
        CancellationToken ct = default)
    {
        var activity = await _repository.GetByIdAsync(activityId, userId, ct);
        if (activity is null)
        {
            return ServiceResult<ActivityDto>.Failure(ServiceError.NotFound, "Activity not found.");
        }

        var references = await ResolveReferencesAsync(userId, request, ct);
        if (!references.Succeeded)
        {
            return ServiceResult<ActivityDto>.Failure(references.Error, references.ErrorMessage!);
        }

        var before = (activity.StartTime, activity.DurationMinutes, activity.SubjectId, activity.TopicId, activity.Status);

        _mapper.Map(request, activity);
        await ApplyAndCleanUpAsync(activity, request, references.Value, ct);

        // Moving or re-targeting a planned session makes it the student's own (kept on re-planning).
        if (activity.IsAutoPlanned &&
            (activity.StartTime, activity.DurationMinutes, activity.SubjectId, activity.TopicId) !=
            (before.StartTime, before.DurationMinutes, before.SubjectId, before.TopicId))
        {
            activity.IsAutoPlanned = false;
        }

        var statusChanged = activity.Status != before.Status;
        if (statusChanged)
        {
            await OnStatusChangedAsync(activity, userId, ct);
        }

        await _uow.SaveChangesAsync(ct);
        if (statusChanged)
        {
            await _planning.ReplanIfActiveAsync(userId, ct);
        }
        return ServiceResult<ActivityDto>.Success(_mapper.Map<ActivityDto>(activity));
    }

    public async Task<ActivityDto?> UpdateStatusAsync(Guid activityId, Guid userId, Status status, CancellationToken ct = default)
    {
        var activity = await _repository.GetByIdAsync(activityId, userId, ct);
        if (activity is null)
        {
            return null;
        }

        if (activity.Status == status)
        {
            return _mapper.Map<ActivityDto>(activity);
        }

        activity.Status = status;
        await OnStatusChangedAsync(activity, userId, ct);
        await _uow.SaveChangesAsync(ct);
        await _planning.ReplanIfActiveAsync(userId, ct);
        return _mapper.Map<ActivityDto>(activity);
    }

    public async Task<bool> DeleteAsync(Guid activityId, Guid userId, CancellationToken ct = default)
    {
        var activity = await _repository.GetByIdAsync(activityId, userId, ct);
        if (activity is null)
        {
            return false;
        }

        if (activity.RecurringOptions is not null)
        {
            await _recurringOptions.DeleteAsync(activity.RecurringOptions, ct);
        }

        await _repository.DeleteAsync(activity, ct);
        await _uow.SaveChangesAsync(ct);
        return true;
    }

    // A finished session on a topic is a review with the topic's current rating; a partial one only
    // counts as studied (docs/PLANNING.md, "Spaced repetition").
    private async Task OnStatusChangedAsync(Activity activity, Guid userId, CancellationToken ct)
    {
        if (activity.TopicId is null || activity.Status is not (Status.Done or Status.PartiallyDone))
        {
            return;
        }

        var topic = await _topics.GetByIdAsync(activity.TopicId.Value, userId, ct);
        if (topic is null)
        {
            return;
        }

        if (activity.Status == Status.Done)
        {
            SpacedRepetition.Review(topic, topic.Feedback, DateTime.UtcNow);
        }
        else
        {
            topic.LastStudied = DateTime.UtcNow;
        }
    }

    // Subject and topic must belong to the caller; a topic implies its subject.
    private async Task<ServiceResult<(Guid? SubjectId, Guid? TopicId)>> ResolveReferencesAsync(
        Guid userId, ActivityRequest request, CancellationToken ct)
    {
        var subjectId = request.SubjectId;

        if (subjectId is not null && !await _subjects.ExistsAsync(subjectId.Value, userId, ct))
        {
            return ServiceResult<(Guid?, Guid?)>.Failure(ServiceError.InvalidReference, "Subject not found.");
        }

        if (request.TopicId is not null)
        {
            var topic = await _topics.GetByIdAsync(request.TopicId.Value, userId, ct);
            if (topic is null)
            {
                return ServiceResult<(Guid?, Guid?)>.Failure(ServiceError.InvalidReference, "Topic not found.");
            }

            if (subjectId is not null && topic.SubjectId != subjectId)
            {
                return ServiceResult<(Guid?, Guid?)>.Failure(ServiceError.InvalidReference,
                    "Topic does not belong to the selected subject.");
            }

            subjectId = topic.SubjectId;
        }

        return ServiceResult<(Guid?, Guid?)>.Success((subjectId, request.TopicId));
    }

    private async Task ApplyAndCleanUpAsync(Activity activity, ActivityRequest request, (Guid? SubjectId, Guid? TopicId) references,
        CancellationToken ct)
    {
        var previousOptions = activity.RecurringOptions;
        Apply(activity, request, references);

        if (previousOptions is not null && activity.RecurringOptions is null)
        {
            await _recurringOptions.DeleteAsync(previousOptions, ct);
        }
    }

    private static void Apply(Activity activity, ActivityRequest request, (Guid? SubjectId, Guid? TopicId) references)
    {
        activity.SubjectId = references.SubjectId;
        activity.TopicId = references.TopicId;
        activity.StartTime = ToUtc(request.StartTime);

        var recurrence = request.IsRecurring ? request.Recurrence : null;
        activity.IsRecurring = recurrence is not null;

        if (recurrence is null)
        {
            activity.RecurringOptions = null;
            activity.RecurringOptionsId = null;
            return;
        }

        var days = recurrence.Frequency == Frequency.Weekly
            ? recurrence.DaysOfWeek.Distinct().ToHashSet()
            : new HashSet<DayOfWeekEnum>();

        var options = activity.RecurringOptions ??= new RecurringOptions();
        options.Frequency = recurrence.Frequency;
        options.Until = recurrence.Until;

        // Diff instead of clear + re-add: the composite key (options id, day) cannot be tracked twice.
        foreach (var removed in options.DaysOfWeek.Where(d => !days.Contains(d.DayOfWeek)).ToList())
        {
            options.DaysOfWeek.Remove(removed);
        }

        foreach (var added in days.Where(d => options.DaysOfWeek.All(existing => existing.DayOfWeek != d)))
        {
            options.DaysOfWeek.Add(new OptionsDayOfWeek { DayOfWeek = added });
        }
    }

    // Postgres "timestamp with time zone" only accepts UTC; a value without an offset is taken as UTC.
    private static DateTime ToUtc(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Local => value.ToUniversalTime(),
        _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
    };

    private static DateTime? ToUtc(DateTime? value) => value is null ? null : ToUtc(value.Value);
}
