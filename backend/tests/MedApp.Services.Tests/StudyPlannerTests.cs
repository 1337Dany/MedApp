using MedApp.Models.Models.Enums;
using MedApp.Services.Planning;
using static MedApp.Services.Tests.PlannerFixtures;

namespace MedApp.Services.Tests;

public class StudyPlannerTests
{
    [Fact]
    public void Manual_subjects_are_never_planned()
    {
        var manual = Subject("Pharmacology", PlanningStrategy.Manual, StudyMode.Emergency);

        var result = StudyPlanner.Plan(Input(new[] { manual }));

        Assert.Empty(result.Sessions);
        Assert.Empty(result.Unmet);
    }

    [Fact]
    public void Sessions_per_day_follow_the_mode()
    {
        var relaxed = Subject("Relaxed", mode: StudyMode.Relaxed);
        var determined = Subject("Determined", mode: StudyMode.Determined);
        var emergency = Subject("Emergency", mode: StudyMode.Emergency);

        var result = StudyPlanner.Plan(Input(new[] { relaxed, determined, emergency }, days: 1));

        Assert.Equal(1, result.Sessions.Count(s => s.SubjectId == relaxed.Id));
        Assert.Equal(2, result.Sessions.Count(s => s.SubjectId == determined.Id));
        Assert.Equal(3, result.Sessions.Count(s => s.SubjectId == emergency.Id));
        Assert.All(result.Sessions, s => Assert.Equal(60, s.DurationMinutes));
    }

    [Fact]
    public void Sessions_avoid_busy_time_stay_in_the_window_and_keep_breaks()
    {
        var subject = Subject("Anatomy", mode: StudyMode.Emergency);
        var lecture = Busy(Monday.Date.AddHours(8), 120, "Lecture");
        var lunch = Busy(Monday.Date.AddHours(11), 60, "Lunch", type: PlanningRules.MealActivityTypeId);

        var sessions = StudyPlanner.Plan(Input(new[] { subject }, busy: new[] { lecture, lunch }, days: 1)).Sessions
            .OrderBy(s => s.Start).ToList();

        Assert.Equal(3, sessions.Count);
        foreach (var s in sessions)
        {
            Assert.True(s.Start >= Monday.Date + PlanningRules.StudyWindowStart);
            Assert.True(s.End <= Monday.Date + PlanningRules.StudyWindowEnd);
            Assert.False(s.Start < lecture.End && s.End > lecture.Start);
            Assert.False(s.Start < lunch.End && s.End > lunch.Start);
            Assert.Equal(0, s.Start.Minute % PlanningRules.SlotMinutes);
        }
        for (var i = 1; i < sessions.Count; i++)
        {
            Assert.True(sessions[i].Start - sessions[i - 1].End >= TimeSpan.FromMinutes(PlanningRules.BreakBetweenSessionsMinutes));
        }
        // First free time after the lecture is 10:00; lunch blocks 11:00-12:00.
        Assert.Equal(Monday.Date.AddHours(10), sessions[0].Start);
        Assert.Equal(Monday.Date.AddHours(12), sessions[1].Start);
    }

    [Fact]
    public void Nothing_is_planned_in_the_past()
    {
        var subject = Subject("Anatomy");
        var now = Monday.Date.AddHours(14).AddMinutes(7);

        var session = Assert.Single(StudyPlanner.Plan(Input(new[] { subject }, days: 1, now: now)).Sessions);

        Assert.Equal(Monday.Date.AddHours(14).AddMinutes(15), session.Start);
    }

    [Fact]
    public void A_short_rest_of_today_is_not_reported_as_a_shortage()
    {
        var subject = Subject("Anatomy", mode: StudyMode.Emergency);
        var lateEvening = Monday.Date.AddHours(21).AddMinutes(30);

        var result = StudyPlanner.Plan(Input(new[] { subject }, days: 2, now: lateEvening));

        Assert.Equal(3, result.Sessions.Count);
        Assert.All(result.Sessions, s => Assert.Equal(Monday.Date.AddDays(1), s.Start.Date));
        Assert.Empty(result.Unmet);
    }

    [Fact]
    public void No_sessions_on_or_after_the_exam_day()
    {
        var exam = DateOnly.FromDateTime(Monday).AddDays(3);
        var subject = Subject("Anatomy", exam: exam);

        var sessions = StudyPlanner.Plan(Input(new[] { subject })).Sessions;

        Assert.Equal(3, sessions.Count);
        Assert.All(sessions, s => Assert.True(DateOnly.FromDateTime(s.Start) < exam));
    }

    [Fact]
    public void Daily_study_cap_includes_existing_study_and_reports_the_shortage()
    {
        var subject = Subject("Biochemistry", mode: StudyMode.Emergency);
        var existingStudy = Busy(Monday.Date.AddHours(8), 5 * 60, "Library", type: PlanningRules.StudyingActivityTypeId);

        var result = StudyPlanner.Plan(Input(new[] { subject }, busy: new[] { existingStudy }, days: 1));

        Assert.Single(result.Sessions); // 5 h + 1 h = the 6 h cap
        var shortage = Assert.Single(result.Unmet);
        Assert.Equal(2, shortage.MissingSessions);
    }

    [Fact]
    public void Urgent_subjects_are_placed_first_but_every_subject_gets_a_first_session()
    {
        var relaxed = Subject("Relaxed", mode: StudyMode.Relaxed);
        var emergency = Subject("Emergency", mode: StudyMode.Emergency);
        // Only room for two one-hour sessions (with the break).
        var busy = new[]
        {
            Busy(Monday.Date.AddHours(8), 0),
            Busy(Monday.Date.AddHours(10).AddMinutes(15), 11 * 60 + 45)
        };

        var sessions = StudyPlanner.Plan(Input(new[] { relaxed, emergency }, busy: busy, days: 1)).Sessions;

        Assert.Equal(2, sessions.Count);
        Assert.Equal(emergency.Id, sessions[0].SubjectId);
        Assert.Equal(relaxed.Id, sessions[1].SubjectId);
    }

    [Fact]
    public void Traffic_light_prefers_red_topics_and_rotates_through_all_of_them()
    {
        var subject = Subject("Anatomy", mode: StudyMode.Determined);
        var red = Topic(subject, "Nerves", Feedback.Red, 0);
        var yellow = Topic(subject, "Bones", Feedback.Yellow, 1);
        var green = Topic(subject, "Heart", Feedback.Green, 2);

        var sessions = StudyPlanner.Plan(Input(new[] { subject }, new[] { red, yellow, green }, days: 14)).Sessions;

        Assert.Equal(red.Id, sessions[0].TopicId);
        Assert.Equal("Study Anatomy: Nerves", sessions[0].Title);
        var counts = sessions.GroupBy(s => s.TopicId).ToDictionary(g => g.Key!.Value, g => g.Count());
        Assert.True(counts[red.Id] > counts[yellow.Id]);
        Assert.True(counts[yellow.Id] > counts[green.Id]);
        Assert.True(counts[green.Id] > 0);
    }

    [Fact]
    public void Active_recall_reviews_only_due_topics_and_spaces_them_out()
    {
        var subject = Subject("Physiology", PlanningStrategy.ActiveRecall, StudyMode.Emergency);
        var due = Topic(subject, "Cardiac cycle", nextReview: Monday.AddDays(-1), stage: 1);
        var later = Topic(subject, "Renal", nextReview: Monday.AddDays(4), stage: 2);

        var sessions = StudyPlanner.Plan(Input(new[] { subject }, new[] { due, later }, days: 7)).Sessions;

        Assert.All(sessions, s => Assert.Equal(30, s.DurationMinutes));
        var dueDays = sessions.Where(s => s.TopicId == due.Id).Select(s => s.Start.Date).ToList();
        var laterDays = sessions.Where(s => s.TopicId == later.Id).Select(s => s.Start.Date).ToList();

        // Stage 1 -> 2 after the review on Monday: next one 7 days later, outside the horizon.
        Assert.Equal(new[] { Monday.Date }, dueDays);
        Assert.Equal(new[] { Monday.Date.AddDays(4) }, laterDays);
        Assert.Empty(StudyPlanner.Plan(Input(new[] { subject }, new[] { due, later }, days: 7)).Unmet);
    }

    [Fact]
    public void Subject_without_topics_gets_general_sessions()
    {
        var subject = Subject("Histology");

        var session = StudyPlanner.Plan(Input(new[] { subject }, days: 1)).Sessions.Single();

        Assert.Null(session.TopicId);
        Assert.Equal("Study Histology", session.Title);
    }

    [Fact]
    public void Planning_is_deterministic()
    {
        var subject = Subject("Anatomy", mode: StudyMode.Emergency);
        var topics = new[] { Topic(subject, "A"), Topic(subject, "B", Feedback.Yellow, 1) };

        var first = StudyPlanner.Plan(Input(new[] { subject }, topics));
        var second = StudyPlanner.Plan(Input(new[] { subject }, topics));

        Assert.Equal(first.Sessions, second.Sessions);
    }
}
