using MedApp.Models.Models.Enums;
using MedApp.Services.DTOs.Analytics;

namespace MedApp.Services.Analytics;

public record StudentActivity(DateTime StartTimeUtc, int DurationMinutes, int ActivityTypeId, Status Status);

public record StudentSubject(string Name, IReadOnlyList<Feedback> TopicFeedback);

public record StudentData(IReadOnlyList<StudentSubject> Subjects, IReadOnlyList<StudentActivity> Activities);

// Pure aggregation for the teacher dashboard. Students are anonymous here (no ids, no names), and
// groups smaller than MinimumGroupSize are never reported.
public static class ClassAnalyticsCalculator
{
    public const int MinimumGroupSize = 5;
    public const int Weeks = 5;
    public const int AtRiskCompletionRate = 60;
    public const double StrugglingRedShare = 0.5;
    private const int StudyingActivityTypeId = 1;

    public static ClassAnalyticsDto Calculate(IReadOnlyList<StudentData> students, DateTime nowUtc)
    {
        var result = new ClassAnalyticsDto { MinimumGroupSize = MinimumGroupSize };
        if (students.Count < MinimumGroupSize)
        {
            result.InsufficientData = true;
            return result;
        }

        result.TotalStudents = students.Count;

        var past = students.Select(s => s.Activities.Where(a => a.StartTimeUtc < nowUtc).ToList()).ToList();
        var rates = past.Select(CompletionRate).Where(r => r is not null).Select(r => r!.Value).ToList();
        result.AverageCompletionRate = rates.Count == 0 ? 0 : (int)Math.Round(rates.Average());

        result.StudentsAtRisk = students.Zip(past).Count(pair =>
            CompletionRate(pair.Second) is < AtRiskCompletionRate ||
            RedShare(pair.First.Subjects.SelectMany(s => s.TopicFeedback).ToList()) > StrugglingRedShare);

        var bySubject = students
            .SelectMany(student => student.Subjects
                .GroupBy(s => Normalize(s.Name))
                .Select(g => (Key: g.Key, Name: g.First().Name.Trim(), Feedback: g.SelectMany(s => s.TopicFeedback).ToList())))
            .GroupBy(x => x.Key)
            .ToList();

        result.ActiveSubjects = bySubject.Count;

        result.SubjectPerformance = bySubject
            .Where(g => g.Count() >= MinimumGroupSize)
            .Select(g =>
            {
                var feedback = g.SelectMany(x => x.Feedback).ToList();
                return new SubjectPerformanceDto
                {
                    Subject = g.First().Name,
                    Students = g.Count(),
                    AvgKnowledge = feedback.Count == 0 ? 0 : (int)Math.Round(feedback.Average(KnowledgeScore)),
                    StudentsStruggling = g.Count(x => RedShare(x.Feedback) > StrugglingRedShare)
                };
            })
            .OrderBy(s => s.Subject, StringComparer.OrdinalIgnoreCase)
            .ToList();

        var currentWeek = WeekStart(DateOnly.FromDateTime(nowUtc));
        for (var i = Weeks - 1; i >= 0; i--)
        {
            var weekStart = currentWeek.AddDays(-7 * i);
            var from = weekStart.ToDateTime(TimeOnly.MinValue);
            var to = from.AddDays(7) < nowUtc ? from.AddDays(7) : nowUtc;

            var weekActivities = past
                .Select(list => list.Where(a => a.StartTimeUtc >= from && a.StartTimeUtc < to).ToList())
                .ToList();

            var studyMinutes = weekActivities.Sum(list => list
                .Where(a => a.ActivityTypeId == StudyingActivityTypeId)
                .Sum(a => a.DurationMinutes * Credit(a.Status)));

            var weekRates = weekActivities.Select(CompletionRate).Where(r => r is not null).Select(r => r!.Value).ToList();

            result.WeeklyEngagement.Add(new WeeklyEngagementDto
            {
                Week = $"Week of {weekStart:MMM d}",
                WeekStart = weekStart,
                AvgStudyHours = Math.Round(studyMinutes / 60.0 / students.Count, 1),
                AvgCompletionRate = weekRates.Count == 0 ? 0 : (int)Math.Round(weekRates.Average())
            });
        }

        return result;
    }

    // Share of past activities completed, in percent (partially done counts half); null without any.
    public static double? CompletionRate(IReadOnlyCollection<StudentActivity> pastActivities) =>
        pastActivities.Count == 0 ? null : 100.0 * pastActivities.Sum(a => Credit(a.Status)) / pastActivities.Count;

    private static double Credit(Status status) => status switch
    {
        Status.Done => 1,
        Status.PartiallyDone => 0.5,
        _ => 0
    };

    private static double RedShare(IReadOnlyCollection<Feedback> feedback) =>
        feedback.Count == 0 ? 0 : (double)feedback.Count(f => f == Feedback.Red) / feedback.Count;

    private static double KnowledgeScore(Feedback feedback) => feedback switch
    {
        Feedback.Green => 100,
        Feedback.Yellow => 50,
        _ => 0
    };

    private static string Normalize(string name) => name.Trim().ToLowerInvariant();

    private static DateOnly WeekStart(DateOnly day) => day.AddDays(-(((int)day.DayOfWeek + 6) % 7));
}
