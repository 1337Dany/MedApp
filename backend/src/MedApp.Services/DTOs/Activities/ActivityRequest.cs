using MedApp.Models.Models.Enums;

namespace MedApp.Services.DTOs.Activities;

// Body of POST /api/activities and PUT /api/activities/{id}. The owner comes from the token.
public class ActivityRequest
{
    public Guid? SubjectId { get; set; }

    // When set without SubjectId, the topic's subject is used.
    public Guid? TopicId { get; set; }

    public string Title { get; set; } = null!;
    public int ActivityTypeId { get; set; }
    public int Priority { get; set; }

    // UTC; a value without an offset is treated as UTC.
    public DateTime StartTime { get; set; }
    public int DurationMinutes { get; set; }

    // Required when IsRecurring is true.
    public bool IsRecurring { get; set; }
    public RecurrenceDto? Recurrence { get; set; }

    public bool IsNegotiable { get; set; }
    public string? Notes { get; set; }
    public Status Status { get; set; } = Status.Scheduled;
}
