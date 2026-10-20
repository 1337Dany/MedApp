using MedApp.Models.Models.Enums;

namespace MedApp.Services.Planning;

// Plain inputs/outputs of the planner. All DateTime values are the student's local wall-clock time.

// Values equal the seeded StudyStrategy ids (StudyStrategyConfig).
public enum PlanningStrategy
{
    TrafficLight = 1,
    ActiveRecall = 2,
    Manual = 3
}

public enum WarningSeverity
{
    Low = 1,
    Medium = 2,
    High = 3
}

public record PlannerSubject(
    Guid Id,
    string Name,
    PlanningStrategy Strategy,
    StudyMode Mode,
    int Priority,
    DateOnly? ExamDate);

public record PlannerTopic(
    Guid Id,
    Guid SubjectId,
    string Title,
    Feedback Feedback,
    int Order,
    DateTime? LastStudied,
    DateTime? NextReview,
    int ReviewStage);

// An activity before recurrence expansion.
public record TimetableEntry(
    string Title,
    int ActivityTypeId,
    DateTime Start,
    int DurationMinutes,
    bool IsNegotiable,
    Frequency? Frequency = null,
    IReadOnlyCollection<DayOfWeekEnum>? DaysOfWeek = null,
    DateOnly? Until = null);

// One concrete occurrence that blocks time.
public record BusyBlock(DateTime Start, DateTime End, string Title, int ActivityTypeId, bool IsNegotiable)
{
    public bool IsStudy => ActivityTypeId == PlanningRules.StudyingActivityTypeId;
}

public record PlanningInput(
    DateTime Now,
    int Days,
    IReadOnlyList<PlannerSubject> Subjects,
    IReadOnlyList<PlannerTopic> Topics,
    IReadOnlyList<BusyBlock> Busy);

public record PlannedSession(
    Guid SubjectId,
    Guid? TopicId,
    string Title,
    DateTime Start,
    int DurationMinutes,
    int Priority)
{
    public DateTime End => Start.AddMinutes(DurationMinutes);
}

// Sessions a subject wanted on a day but that did not fit.
public record UnmetDemand(Guid SubjectId, DateOnly Date, int MissingSessions);

public record PlanningResult(IReadOnlyList<PlannedSession> Sessions, IReadOnlyList<UnmetDemand> Unmet);

public record PlanningWarning(DateOnly Date, WarningSeverity Severity, string Message, IReadOnlyList<string> Suggestions);
