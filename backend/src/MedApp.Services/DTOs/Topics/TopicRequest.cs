using MedApp.Models.Models.Enums;

namespace MedApp.Services.DTOs.Topics;

// Body of POST /api/subjects/{subjectId}/topics and PUT /api/topics/{id}.
// LastStudied / NextReview are maintained by the server.
public class TopicRequest
{
    public string Title { get; set; } = null!;
    public string? Notes { get; set; }
    public Feedback Feedback { get; set; }

    // Null on create appends the topic at the end; null on update keeps the current position.
    public int? Order { get; set; }
}
