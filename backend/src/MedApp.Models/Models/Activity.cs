using MedApp.Models.Models.Enums;

namespace MedApp.Models.Models;

public class Activity
{
    public Guid ActivityId { get; set; }

    public Guid SubjectId { get; set; }
    public Subject Subject { get; set; } = null!;

    public string Title { get; set; } = null!;

    public int ActivityTypeId { get; set; }
    public ActivityType ActivityType { get; set; } = null!;

    public int Priority { get; set; }

    public DateTime StartTime { get; set; }
    public int DurationMinutes { get; set; }

    public bool IsRecurring { get; set; }

    public Guid? RecurringOptionsId { get; set; }
    public RecurringOptions? RecurringOptions { get; set; }

    public bool IsNegotiable { get; set; }
    public string? Notes { get; set; }

    public Status Status { get; set; }
}