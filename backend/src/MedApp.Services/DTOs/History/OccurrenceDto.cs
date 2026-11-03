using MedApp.Models.Models.Enums;

namespace MedApp.Services.DTOs.History;

// One concrete occurrence of an activity: from the history before now, from the current timetable after it.
public class OccurrenceDto
{
    // The history entry; null for a coming occurrence that has none yet.
    public Guid? Id { get; set; }

    // Null for history that no longer belongs to an activity (a series that became a one-off).
    public Guid? ActivityId { get; set; }
    public Guid? SubjectId { get; set; }
    public string Title { get; set; } = null!;
    public int ActivityTypeId { get; set; }
    public DateTime StartTime { get; set; }
    public int DurationMinutes { get; set; }
    public Status Status { get; set; }
}
