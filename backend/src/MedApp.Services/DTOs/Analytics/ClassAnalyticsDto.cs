namespace MedApp.Services.DTOs.Analytics;

// Aggregated, anonymous view over students who allowed data sharing (GET /api/teacher/analytics).
public class ClassAnalyticsDto
{
    // True when fewer than MinimumGroupSize students share data; all figures are then withheld.
    public bool InsufficientData { get; set; }
    public int MinimumGroupSize { get; set; }

    public int TotalStudents { get; set; }
    public int AverageCompletionRate { get; set; }
    public int StudentsAtRisk { get; set; }
    public int ActiveSubjects { get; set; }

    public List<WeeklyEngagementDto> WeeklyEngagement { get; set; } = new();

    // Only subjects studied by at least MinimumGroupSize students.
    public List<SubjectPerformanceDto> SubjectPerformance { get; set; } = new();
}

public class WeeklyEngagementDto
{
    public string Week { get; set; } = null!;
    public DateOnly WeekStart { get; set; }
    public double AvgStudyHours { get; set; }
    public int AvgCompletionRate { get; set; }
}

public class SubjectPerformanceDto
{
    public string Subject { get; set; } = null!;
    public int Students { get; set; }
    public int AvgKnowledge { get; set; }
    public int StudentsStruggling { get; set; }
}
