using MedApp.Models.Models.Enums;

namespace MedApp.Services.DTOs.Activities;

public class ActivityDto
{
    public Guid Id { get; set; }
    public Guid? SubjectId { get; set; }
    public Guid? TopicId { get; set; }
    public string Title { get; set; } = null!;
    public int ActivityTypeId { get; set; }
    public int Priority { get; set; }
    public DateTime StartTime { get; set; }
    public int DurationMinutes { get; set; }
    public bool IsRecurring { get; set; }
    public RecurrenceDto? Recurrence { get; set; }
    public bool IsNegotiable { get; set; }
    public string? Notes { get; set; }
    public Status Status { get; set; }

    // Created by the study planner; replaced on re-planning while still scheduled.
    public bool IsAutoPlanned { get; set; }
}
