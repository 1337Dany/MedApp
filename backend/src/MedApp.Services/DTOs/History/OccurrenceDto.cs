using MedApp.Models.Models.Enums;

namespace MedApp.Services.DTOs.History;

// One concrete occurrence of an activity: from the history before now, from the current timetable after it.
public class OccurrenceDto
{
    // Null when the activity has been deleted since.
    public Guid? ActivityId { get; set; }
    public Guid? SubjectId { get; set; }
    public string Title { get; set; } = null!;
    public int ActivityTypeId { get; set; }
    public DateTime StartTime { get; set; }
    public int DurationMinutes { get; set; }
    public Status Status { get; set; }
}
