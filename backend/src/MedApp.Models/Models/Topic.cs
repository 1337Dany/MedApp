using MedApp.Models.Models.Enums;

namespace MedApp.Models.Models;

public class Topic
{
    public Guid TopicId { get; set; }

    public string TopicTitle { get; set; } = null!;
    public string? Notes { get; set; }

    public Guid SubjectId { get; set; }
    public Subject Subject { get; set; } = null!;

    public Feedback Feedback { get; set; }

    // Position inside the subject's topic list.
    public int Order { get; set; }

    public DateTime? LastStudied { get; set; }
    public DateTime? NextReview { get; set; }

    // Spaced-repetition stage (index into PlanningRules.ReviewIntervalsDays).
    public int ReviewStage { get; set; }
}