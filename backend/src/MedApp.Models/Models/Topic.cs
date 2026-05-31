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
}