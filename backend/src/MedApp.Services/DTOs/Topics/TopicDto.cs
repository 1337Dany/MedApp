using MedApp.Models.Models.Enums;

namespace MedApp.Services.DTOs.Topics;

public class TopicDto
{
    public Guid Id { get; set; }
    public Guid SubjectId { get; set; }
    public string Title { get; set; } = null!;
    public string? Notes { get; set; }
    public Feedback Feedback { get; set; }
    public int Order { get; set; }
    public DateTime? LastStudied { get; set; }
    public DateTime? NextReview { get; set; }
}
