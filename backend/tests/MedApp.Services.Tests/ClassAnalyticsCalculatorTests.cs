using MedApp.Models.Models.Enums;
using MedApp.Services.Analytics;

namespace MedApp.Services.Tests;

public class ClassAnalyticsCalculatorTests
{
    // Thursday 8 Oct 2026, noon UTC.
    private static readonly DateTime Now = new(2026, 10, 8, 12, 0, 0, DateTimeKind.Utc);

    private static StudentActivity Study(int daysAgo, Status status, int minutes = 60) =>
        new(Now.AddDays(-daysAgo), minutes, 1, status);

    private static StudentData Student(IEnumerable<StudentSubject>? subjects = null, params StudentActivity[] activities) =>
        new((subjects ?? Array.Empty<StudentSubject>()).ToList(), activities);

    [Fact]
    public void Fewer_students_than_the_minimum_reveal_nothing()
    {
        var students = Enumerable.Range(0, ClassAnalyticsCalculator.MinimumGroupSize - 1)
            .Select(_ => Student(null, Study(1, Status.Done)))
            .ToList();

        var result = ClassAnalyticsCalculator.Calculate(students, Now);

        Assert.True(result.InsufficientData);
        Assert.Equal(0, result.TotalStudents);
        Assert.Empty(result.WeeklyEngagement);
        Assert.Empty(result.SubjectPerformance);
    }

    [Fact]
    public void Small_subject_groups_are_suppressed_and_names_are_grouped_case_insensitively()
    {
        var students = Enumerable.Range(0, 5)
            .Select(i => Student(new[]
            {
                new StudentSubject(i % 2 == 0 ? "Anatomy" : " anatomy ", new[] { Feedback.Green, Feedback.Red }),
                new StudentSubject($"Elective {i}", new[] { Feedback.Green })
            }))
            .ToList();

        var result = ClassAnalyticsCalculator.Calculate(students, Now);

        var anatomy = Assert.Single(result.SubjectPerformance);
        Assert.Equal("Anatomy", anatomy.Subject);
        Assert.Equal(5, anatomy.Students);
        Assert.Equal(50, anatomy.AvgKnowledge);
        Assert.Equal(0, anatomy.StudentsStruggling); // exactly half red is not "more than half"
        Assert.Equal(6, result.ActiveSubjects);
    }

    [Fact]
    public void Completion_risk_and_weekly_engagement()
    {
        var students = new List<StudentData>
        {
            Student(null, Study(1, Status.Done), Study(2, Status.Done)),                 // 100 %
            Student(null, Study(1, Status.Done), Study(2, Status.PartiallyDone)),        // 75 %
            Student(null, Study(1, Status.Skipped), Study(2, Status.Scheduled)),         // 0 %, at risk
            Student(new[] { new StudentSubject("Biochemistry", new[] { Feedback.Red, Feedback.Red, Feedback.Yellow }) }),
            Student(null, Study(-1, Status.Scheduled))                                   // future only: no rate
        };

        var result = ClassAnalyticsCalculator.Calculate(students, Now);

        Assert.False(result.InsufficientData);
        Assert.Equal(5, result.TotalStudents);
        Assert.Equal(58, result.AverageCompletionRate); // (100 + 75 + 0) / 3
        Assert.Equal(2, result.StudentsAtRisk);         // 0 % completion, and mostly red topics

        Assert.Equal(ClassAnalyticsCalculator.Weeks, result.WeeklyEngagement.Count);
        var thisWeek = result.WeeklyEngagement[^1];
        Assert.Equal(new DateOnly(2026, 10, 5), thisWeek.WeekStart);
        // Done 3 h + partial 0.5 h over 5 students.
        Assert.Equal(0.7, thisWeek.AvgStudyHours);
        Assert.Equal("Week of Oct 5", thisWeek.Week);
    }
}
