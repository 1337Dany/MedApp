using AutoMapper;
using MedApp.Models.Models.Enums;
using MedApp.Services.DTOs.Activities;
using MedApp.Services.DTOs.Subjects;
using MedApp.Services.DTOs.Topics;
using MedApp.Services.DTOs.Users;
using MedApp.Services.Planning;
using MedApp.Services.Repositories;

namespace MedApp.Services.Services;

public class OnboardingService : IOnboardingService
{
    private const int Studying = 1, Class = 2, Rest = 3, Sport = 4, Meal = 6, Sleep = 7; // ActivityTypes
    private const int TrafficLight = 1, ActiveRecall = 2, Manual = 3; // StudyStrategies

    private readonly IUserRepository _users;
    private readonly ISubjectService _subjects;
    private readonly ITopicService _topics;
    private readonly IActivityService _activities;
    private readonly IActivityHistoryService _history;
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;

    public OnboardingService(
        IUserRepository users,
        ISubjectService subjects,
        ITopicService topics,
        IActivityService activities,
        IActivityHistoryService history,
        IUnitOfWork uow,
        IMapper mapper)
    {
        _users = users;
        _subjects = subjects;
        _topics = topics;
        _activities = activities;
        _history = history;
        _uow = uow;
        _mapper = mapper;
    }

    public async Task<ServiceResult<UserDto>> LoadDemoDataAsync(Guid userId, string? timeZone, CancellationToken ct = default)
    {
        await using var transaction = await _history.BeginWriteAsync(userId, ct);

        var user = await _users.GetByIdAsync(userId, ct);
        if (user is null)
        {
            return ServiceResult<UserDto>.Failure(ServiceError.NotFound, "User not found.");
        }

        if (user.SetupCompleted ||
            (await _subjects.GetAllAsync(userId, ct)).Any() ||
            (await _activities.GetAllAsync(userId, ct: ct)).Any())
        {
            return ServiceResult<UserDto>.Failure(ServiceError.NotAllowed, "Demo data can only be added to a new, empty account.");
        }

        var zone = TimeZones.Find(timeZone) ?? TimeZones.Find(user.TimeZone) ?? TimeZoneInfo.Utc;
        await SaveDemoDataAsync(userId, TimeZones.ToLocal(DateTime.UtcNow, zone).Date, zone, ct);

        user.SetupCompleted = true;
        await _uow.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return ServiceResult<UserDto>.Success(_mapper.Map<UserDto>(user));
    }

    public async Task<ServiceResult<UserDto>> CompleteAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(userId, ct);
        if (user is null)
        {
            return ServiceResult<UserDto>.Failure(ServiceError.NotFound, "User not found.");
        }

        user.SetupCompleted = true;
        await _uow.SaveChangesAsync(ct);
        return ServiceResult<UserDto>.Success(_mapper.Map<UserDto>(user));
    }

    private async Task SaveDemoDataAsync(Guid userId, DateTime today, TimeZoneInfo zone, CancellationToken ct)
    {
        var anatomy = await SubjectAsync("Anatomy", 30, 8, TrafficLight, StudyMode.Determined, "#3b82f6");
        var physiology = await SubjectAsync("Physiology", 45, 7, ActiveRecall, StudyMode.Relaxed, "#8b5cf6");
        var biochemistry = await SubjectAsync("Biochemistry", 15, 9, TrafficLight, StudyMode.Emergency, "#ef4444");
        var pharmacology = await SubjectAsync("Pharmacology", 60, 6, Manual, StudyMode.Relaxed, "#10b981");

        await TopicsAsync(anatomy,
            ("Heart Structure", Feedback.Green, "Four chambers, valves"),
            ("Circulatory System", Feedback.Yellow, "Systemic and pulmonary circulation"),
            ("Nervous System", Feedback.Red, null),
            ("Skeletal System", Feedback.Yellow, null),
            ("Muscular System", Feedback.Red, null));
        await TopicsAsync(physiology,
            ("Cardiac Cycle", Feedback.Green, null),
            ("Blood Pressure Regulation", Feedback.Yellow, null),
            ("Respiratory Mechanics", Feedback.Red, null),
            ("Renal Function", Feedback.Yellow, null));
        var biochemistryTopics = await TopicsAsync(biochemistry,
            ("Glycolysis", Feedback.Red, null),
            ("Krebs Cycle", Feedback.Red, null),
            ("Electron Transport Chain", Feedback.Yellow, null),
            ("Amino Acid Metabolism", Feedback.Red, null),
            ("Lipid Metabolism", Feedback.Red, null));
        await TopicsAsync(pharmacology,
            ("Drug Absorption", Feedback.Green, null),
            ("Drug Distribution", Feedback.Yellow, null),
            ("Drug Metabolism", Feedback.Yellow, null));

        // The weekly routine as series that start on Sunday of this week.
        var weekStart = today.AddDays(-(int)today.DayOfWeek);
        DayOfWeekEnum[] lectureDays = [DayOfWeekEnum.Monday, DayOfWeekEnum.Wednesday, DayOfWeekEnum.Friday];

        await SeriesAsync("Sleep", Sleep, 0, 0, 480);
        await SeriesAsync("Breakfast", Meal, 8, 0, 30);
        await SeriesAsync("Lunch", Meal, 12, 0, 45);
        await SeriesAsync("Dinner", Meal, 18, 30, 45);
        await SeriesAsync("Anatomy Lecture", Class, 9, 0, 120, lectureDays, anatomy);
        await SeriesAsync("Physiology Lab", Class, 13, 0, 180, [DayOfWeekEnum.Tuesday, DayOfWeekEnum.Thursday], physiology);
        await SeriesAsync("Gym / Exercise", Sport, 20, 0, 60, lectureDays, negotiable: true, priority: 3);
        await SeriesAsync("Hobbies & Relaxation", Rest, 14, 0, 180, [DayOfWeekEnum.Sunday, DayOfWeekEnum.Saturday],
            negotiable: true, priority: 2);

        // One-off study sessions on this week's weekdays; the past ones already have a result.
        for (var day = 1; day <= 5; day++)
        {
            var date = weekStart.AddDays(day);
            await ActivityAsync(new ActivityRequest
            {
                Title = "Study Biochemistry",
                ActivityTypeId = Studying,
                StartTime = TimeZones.ToUtc(date.AddHours(16), zone),
                DurationMinutes = 90,
                IsNegotiable = true,
                Priority = 4,
                Status = date >= today ? Status.Scheduled : day % 3 == 0 ? Status.PartiallyDone : Status.Done,
                SubjectId = biochemistry,
                TopicId = biochemistryTopics[day - 1],
            });
        }

        async Task<Guid> SubjectAsync(string name, int examInDays, int priority, int method, StudyMode mode, string color) =>
            (await _subjects.CreateAsync(userId, new SubjectRequest
            {
                Name = name,
                ExamDate = DateOnly.FromDateTime(today.AddDays(examInDays)),
                Priority = priority,
                PlanningMethodId = method,
                StudyMode = mode,
                ColorHex = color,
            }, ct)).Id;

        async Task<List<Guid>> TopicsAsync(Guid subjectId, params (string Title, Feedback Feedback, string? Notes)[] topics)
        {
            var ids = new List<Guid>();
            foreach (var (title, feedback, notes) in topics)
            {
                var request = new TopicRequest { Title = title, Feedback = feedback, Notes = notes, Order = ids.Count };
                ids.Add((await _topics.CreateAsync(subjectId, userId, request, ct))!.Id);
            }

            return ids;
        }

        Task SeriesAsync(string title, int type, int hour, int minute, int duration, DayOfWeekEnum[]? days = null,
            Guid? subjectId = null, bool negotiable = false, int priority = 5) =>
            ActivityAsync(new ActivityRequest
            {
                Title = title,
                ActivityTypeId = type,
                StartTime = TimeZones.ToUtc(weekStart.AddHours(hour).AddMinutes(minute), zone),
                DurationMinutes = duration,
                IsRecurring = true,
                Recurrence = new RecurrenceDto
                {
                    Frequency = days is null ? Frequency.Daily : Frequency.Weekly,
                    DaysOfWeek = days?.ToList() ?? [],
                },
                IsNegotiable = negotiable,
                Priority = priority,
                SubjectId = subjectId,
            });

        async Task ActivityAsync(ActivityRequest request)
        {
            var result = await _activities.CreateAsync(userId, request, ct);
            if (!result.Succeeded)
            {
                throw new InvalidOperationException($"Could not save the demo activity '{request.Title}': {result.ErrorMessage}");
            }
        }
    }
}
