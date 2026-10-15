using MedApp.Models.Models.Enums;

namespace MedApp.Services.Planning;

// The numbers behind docs/PLANNING.md.
public static class PlanningRules
{
    public static readonly TimeSpan StudyWindowStart = TimeSpan.FromHours(8);
    public static readonly TimeSpan StudyWindowEnd = TimeSpan.FromHours(22);

    public const int SlotMinutes = 15;
    public const int BreakBetweenSessionsMinutes = 15;
    public const int MaxStudyMinutesPerDay = 6 * 60;

    public const int DefaultHorizonDays = 7;
    public const int MaxHorizonDays = 28;

    public const int MaxRecencyDays = 14;

    // Review interval (days) for each spaced-repetition stage.
    public static readonly int[] ReviewIntervalsDays = { 1, 3, 7, 14, 30 };

    public const int OverloadMediumMinutes = 8 * 60;
    public const int OverloadHighMinutes = 10 * 60;
    public const int ExamSoonDays = 7;
    public const int ExamVerySoonDays = 3;

    // Seeded ActivityType ids (ActivityTypeConfig).
    public const int StudyingActivityTypeId = 1;
    public const int RestActivityTypeId = 3;
    public const int MealActivityTypeId = 6;
    public const int SleepActivityTypeId = 7;

    public static int SessionsPerDay(StudyMode mode) => mode switch
    {
        StudyMode.Emergency => 3,
        StudyMode.Determined => 2,
        _ => 1
    };

    public static int SessionMinutes(PlanningStrategy strategy) =>
        strategy == PlanningStrategy.ActiveRecall ? 30 : 60;

    public static int SessionPriority(StudyMode mode) => mode switch
    {
        StudyMode.Emergency => 5,
        StudyMode.Determined => 4,
        _ => 3
    };

    public static int FeedbackWeight(Feedback feedback) => feedback switch
    {
        Feedback.Red => 3,
        Feedback.Yellow => 2,
        _ => 1
    };

    // Time that does not count as workload.
    public static bool IsRecovery(int activityTypeId) =>
        activityTypeId is RestActivityTypeId or MealActivityTypeId or SleepActivityTypeId;
}
