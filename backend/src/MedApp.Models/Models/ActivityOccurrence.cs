using MedApp.Models.Models.Enums;

namespace MedApp.Models.Models;

// One occurrence of an activity in the history (docs/ANALYTICS.md). Past occurrences are copied here with
// the values they had at the time, so changing or deleting a series later does not rewrite past weeks.
// A row can also exist for a future occurrence of a series, when only that occurrence got a status.
public class ActivityOccurrence
{
    public Guid ActivityOccurrenceId { get; set; }

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    // Null once a series has become a one-off activity: its earlier occurrences stay in the history on their own.
    public Guid? ActivityId { get; set; }
    public Activity? Activity { get; set; }

    public Guid? SubjectId { get; set; }
    public Subject? Subject { get; set; }

    public string Title { get; set; } = null!;

    public int ActivityTypeId { get; set; }
    public ActivityType ActivityType { get; set; } = null!;

    public DateTime StartTime { get; set; }
    public int DurationMinutes { get; set; }

    public Status Status { get; set; }
}
