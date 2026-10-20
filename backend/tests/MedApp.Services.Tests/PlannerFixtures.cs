using MedApp.Models.Models.Enums;
using MedApp.Services.Planning;

namespace MedApp.Services.Tests;

internal static class PlannerFixtures
{
    // Monday 5 Oct 2026, 07:00 local.
    public static readonly DateTime Monday = new(2026, 10, 5, 7, 0, 0);

    public static PlannerSubject Subject(string name, PlanningStrategy strategy = PlanningStrategy.TrafficLight,
        StudyMode mode = StudyMode.Relaxed, DateOnly? exam = null, int priority = 5) =>
        new(Guid.NewGuid(), name, strategy, mode, priority, exam);

    public static PlannerTopic Topic(PlannerSubject subject, string title, Feedback feedback = Feedback.Red, int order = 0,
        DateTime? lastStudied = null, DateTime? nextReview = null, int stage = 0) =>
        new(Guid.NewGuid(), subject.Id, title, feedback, order, lastStudied, nextReview, stage);

    public static BusyBlock Busy(DateTime start, int minutes, string title = "Busy", int type = 5, bool negotiable = false) =>
        new(start, start.AddMinutes(minutes), title, type, negotiable);

    public static PlanningInput Input(IEnumerable<PlannerSubject> subjects, IEnumerable<PlannerTopic>? topics = null,
        IEnumerable<BusyBlock>? busy = null, int days = 7, DateTime? now = null) =>
        new(now ?? Monday, days, subjects.ToList(), (topics ?? Array.Empty<PlannerTopic>()).ToList(),
            (busy ?? Array.Empty<BusyBlock>()).ToList());
}
