using AutoMapper;
using MedApp.Models.Models;
using MedApp.Models.Models.Enums;
using MedApp.Services.DTOs.Activities;
using MedApp.Services.DTOs.Planning;
using MedApp.Services.Planning;
using MedApp.Services.Repositories;

namespace MedApp.Services.Services;

// Loads the caller's data, converts it to local time, runs the pure planner and stores the sessions.
public class PlanningService : IPlanningService
{
    private readonly IUserRepository _users;
    private readonly ISubjectRepository _subjects;
    private readonly ITopicRepository _topics;
    private readonly IActivityRepository _activities;
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;

    public PlanningService(
        IUserRepository users,
        ISubjectRepository subjects,
        ITopicRepository topics,
        IActivityRepository activities,
        IUnitOfWork uow,
        IMapper mapper)
    {
        _users = users;
        _subjects = subjects;
        _topics = topics;
        _activities = activities;
        _uow = uow;
        _mapper = mapper;
    }

    public async Task<PlanResultDto?> GenerateAsync(Guid userId, PlanRequest request, CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(userId, ct);
        if (user is null)
        {
            return null;
        }

        var zone = TimeZones.Find(request.TimeZone);
        if (zone is not null)
        {
            user.TimeZone = request.TimeZone;
        }
        zone ??= TimeZones.Find(user.TimeZone) ?? TimeZoneInfo.Utc;

        var context = await BuildContextAsync(userId, zone, request.Days ?? PlanningRules.DefaultHorizonDays, ct);

        foreach (var old in context.Replaceable)
        {
            await _activities.DeleteAsync(old, ct);
        }

        var plan = StudyPlanner.Plan(context.Input);
        var sessions = plan.Sessions.Select(s => new Activity
        {
            UserId = userId,
            SubjectId = s.SubjectId,
            TopicId = s.TopicId,
            Title = s.Title,
            ActivityTypeId = PlanningRules.StudyingActivityTypeId,
            Priority = s.Priority,
            StartTime = TimeZones.ToUtc(s.Start, zone),
            DurationMinutes = s.DurationMinutes,
            IsNegotiable = true,
            Status = Status.Scheduled,
            IsAutoPlanned = true
        }).ToList();

        foreach (var session in sessions)
        {
            await _activities.AddAsync(session, ct);
        }
        await _uow.SaveChangesAsync(ct);

        return new PlanResultDto
        {
            Sessions = _mapper.Map<List<ActivityDto>>(sessions),
            Warnings = _mapper.Map<List<PlanningWarningDto>>(WorkloadAnalyzer.Analyze(context.Input, plan))
        };
    }

    public async Task<IEnumerable<PlanningWarningDto>> GetWarningsAsync(Guid userId, string? timeZone, int? days,
        CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(userId, ct);
        var zone = TimeZones.Find(timeZone) ?? TimeZones.Find(user?.TimeZone) ?? TimeZoneInfo.Utc;

        var context = await BuildContextAsync(userId, zone, days ?? PlanningRules.DefaultHorizonDays, ct);

        // With a plan, warn about what re-planning now would produce (it is deterministic, so this is the
        // current plan unless data changed); without one, only about the student's own timetable.
        var plan = context.Replaceable.Count > 0
            ? StudyPlanner.Plan(context.Input)
            : new PlanningResult(Array.Empty<PlannedSession>(), Array.Empty<UnmetDemand>());

        return _mapper.Map<List<PlanningWarningDto>>(WorkloadAnalyzer.Analyze(context.Input, plan));
    }

    public async Task ReplanIfActiveAsync(Guid userId, CancellationToken ct = default)
    {
        var nowUtc = DateTime.UtcNow;
        var current = await _activities.GetReplaceableAutoPlannedAsync(userId, nowUtc, ct);
        if (current.Count == 0)
        {
            return;
        }

        // Keep the horizon the student planned last time.
        var user = await _users.GetByIdAsync(userId, ct);
        var zone = TimeZones.Find(user?.TimeZone) ?? TimeZoneInfo.Utc;
        var today = TimeZones.ToLocal(nowUtc, zone).Date;
        var lastDay = TimeZones.ToLocal(current.Max(a => a.StartTime), zone).Date;
        var days = Math.Clamp((lastDay - today).Days + 1, PlanningRules.DefaultHorizonDays, PlanningRules.MaxHorizonDays);

        await GenerateAsync(userId, new PlanRequest { Days = days }, ct);
    }

    private async Task<PlanningContext> BuildContextAsync(Guid userId, TimeZoneInfo zone, int days, CancellationToken ct)
    {
        days = Math.Clamp(days, 1, PlanningRules.MaxHorizonDays);
        var nowUtc = DateTime.UtcNow;
        var nowLocal = TimeZones.ToLocal(nowUtc, zone);
        var horizonStart = nowLocal.Date;
        var horizonEnd = horizonStart.AddDays(days);

        var activities = (await _activities.GetByUserIdAsync(userId,
            TimeZones.ToUtc(horizonStart.AddDays(-1), zone), TimeZones.ToUtc(horizonEnd, zone), ct)).ToList();

        var replaceable = activities
            .Where(a => a.IsAutoPlanned && a.Status == Status.Scheduled && a.StartTime >= nowUtc)
            .ToList();

        // Skipped activities free their time.
        var timetable = activities
            .Except(replaceable)
            .Where(a => a.Status != Status.Skipped)
            .Select(a => new TimetableEntry(
                a.Title,
                a.ActivityTypeId,
                TimeZones.ToLocal(a.StartTime, zone),
                a.DurationMinutes,
                a.IsNegotiable,
                a.IsRecurring ? a.RecurringOptions?.Frequency : null,
                a.RecurringOptions?.DaysOfWeek.Select(d => d.DayOfWeek).ToList(),
                a.RecurringOptions?.Until));

        var subjects = (await _subjects.GetByUserIdAsync(userId, ct))
            .Select(s => new PlannerSubject(
                s.SubjectId,
                s.Name,
                Enum.IsDefined(typeof(PlanningStrategy), s.PlanningMethodId)
                    ? (PlanningStrategy)s.PlanningMethodId
                    : PlanningStrategy.Manual,
                s.StudyMode,
                s.Priority,
                s.ExamDate))
            .ToList();

        var topics = (await _topics.GetByUserIdAsync(userId, null, ct))
            .Select(t => new PlannerTopic(
                t.TopicId,
                t.SubjectId,
                t.TopicTitle,
                t.Feedback,
                t.Order,
                t.LastStudied is null ? null : TimeZones.ToLocal(t.LastStudied.Value, zone),
                t.NextReview is null ? null : TimeZones.ToLocal(t.NextReview.Value, zone),
                t.ReviewStage))
            .ToList();

        var input = new PlanningInput(
            nowLocal,
            days,
            subjects,
            topics,
            RecurrenceExpander.Expand(timetable, horizonStart, horizonEnd).ToList());

        return new PlanningContext(input, replaceable);
    }

    private sealed record PlanningContext(PlanningInput Input, List<Activity> Replaceable);
}
