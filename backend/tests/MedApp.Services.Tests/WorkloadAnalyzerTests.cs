using MedApp.Models.Models.Enums;
using MedApp.Services.Planning;
using static MedApp.Services.Tests.PlannerFixtures;

namespace MedApp.Services.Tests;

public class WorkloadAnalyzerTests
{
    [Fact]
    public void Overloaded_day_is_reported_with_movable_activities()
    {
        var work = Busy(Monday.Date.AddHours(8), 9 * 60, "Shift");
        var gym = Busy(Monday.Date.AddHours(18), 90, "Gym", type: 4, negotiable: true);
        var sleep = Busy(Monday.Date.AddHours(22), 8 * 60, "Sleep", type: PlanningRules.SleepActivityTypeId);
        var input = Input(Array.Empty<PlannerSubject>(), busy: new[] { work, gym, sleep }, days: 1);

        var warning = Assert.Single(WorkloadAnalyzer.Analyze(input, StudyPlanner.Plan(input)));

        Assert.Equal(WarningSeverity.High, warning.Severity);
        Assert.Contains("10 h 30 min", warning.Message);
        Assert.Contains(warning.Suggestions, s => s.Contains("Gym"));
    }

    [Fact]
    public void Shortage_before_a_close_exam_is_high()
    {
        var subject = Subject("Biochemistry", mode: StudyMode.Emergency, exam: DateOnly.FromDateTime(Monday).AddDays(5));
        var fullDay = Busy(Monday.Date.AddHours(8), 14 * 60, "Clinic", type: 5);
        var input = Input(new[] { subject }, busy: new[] { fullDay }, days: 1);

        var warnings = WorkloadAnalyzer.Analyze(input, StudyPlanner.Plan(input));

        Assert.Contains(warnings, w => w.Severity == WarningSeverity.High && w.Message.StartsWith("3 Biochemistry sessions"));
    }

    [Fact]
    public void Mode_and_topic_hints()
    {
        var soon = Subject("Anatomy", mode: StudyMode.Determined, exam: DateOnly.FromDateTime(Monday).AddDays(2));
        var relaxed = Subject("Physiology", mode: StudyMode.Relaxed, exam: DateOnly.FromDateTime(Monday).AddDays(6));
        var recall = Subject("Pharmacology", PlanningStrategy.ActiveRecall);
        var input = Input(new[] { soon, relaxed, recall }, days: 1);

        var warnings = WorkloadAnalyzer.Analyze(input, StudyPlanner.Plan(input));

        Assert.Contains(warnings, w => w.Severity == WarningSeverity.Medium && w.Message.Contains("Anatomy exam in 2 days"));
        Assert.Contains(warnings, w => w.Severity == WarningSeverity.Low && w.Message.Contains("Physiology exam in 6 days"));
        Assert.Contains(warnings, w => w.Message.Contains("Pharmacology uses Active Recall but has no topics"));
    }
}
