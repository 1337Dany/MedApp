using MedApp.Models.Models;
using MedApp.Models.Models.Enums;
using MedApp.Services.Planning;

namespace MedApp.Services.History;

// Occurrences of stored activities in UTC. A series repeats in the student's local time (RecurrenceExpander).
public static class OccurrenceExpander
{
    public static bool IsSeries(Activity activity) => activity.IsRecurring && activity.RecurringOptions is not null;

    // Starts of the activity's occurrences in [fromUtc, toUtc).
    public static IEnumerable<DateTime> StartsUtc(Activity activity, DateTime fromUtc, DateTime toUtc, TimeZoneInfo zone)
    {
        if (!IsSeries(activity))
        {
            return activity.StartTime >= fromUtc && activity.StartTime < toUtc ? [activity.StartTime] : [];
        }

        var options = activity.RecurringOptions!;
        var entry = new TimetableEntry(
            activity.Title,
            activity.ActivityTypeId,
            TimeZones.ToLocal(activity.StartTime, zone),
            activity.DurationMinutes,
            activity.IsNegotiable,
            options.Frequency,
            options.DaysOfWeek.Select(d => d.DayOfWeek).ToList(),
            options.Until);

        // A day of margin on both sides, because the range is converted to local time and the result back to UTC.
        return RecurrenceExpander
            .Occurrences(entry, TimeZones.ToLocal(fromUtc, zone).AddDays(-1), TimeZones.ToLocal(toUtc, zone).AddDays(1))
            .Select(start => TimeZones.ToUtc(start, zone))
            .Where(start => start >= fromUtc && start < toUtc);
    }

    // Status of an occurrence nobody marked: a one-off activity has its own status, a series only passes on "skipped".
    public static Status DefaultStatus(Activity activity) =>
        !IsSeries(activity) ? activity.Status
        : activity.Status == Status.Skipped ? Status.Skipped
        : Status.Scheduled;
}
