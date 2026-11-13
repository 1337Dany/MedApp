using MedApp.Models.Models;
using MedApp.Models.Models.Enums;
using MedApp.Services.Planning;
using MedApp.Services.Validation;

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

    // Where the recording of the activity into the history continues. Rows from before the accepted dates exist only
    // in old data; nothing is recorded that far back.
    public static DateTime UnrecordedFromUtc(Activity activity)
    {
        var from = activity.HistoryRecordedUntil ?? activity.StartTime;
        return from < ActivityDates.MinUtc ? ActivityDates.MinUtc : from;
    }

    // Starts of the occurrences that have begun by nowUtc and are not in the history yet.
    public static IEnumerable<DateTime> UnrecordedStartsUtc(Activity activity, DateTime nowUtc, TimeZoneInfo zone) =>
        StartsUtc(activity, UnrecordedFromUtc(activity), nowUtc, zone);

    // Status of an occurrence nobody marked: a one-off activity has its own status, a series only passes on "skipped".
    public static Status DefaultStatus(Activity activity) =>
        !IsSeries(activity) ? activity.Status
        : activity.Status == Status.Skipped ? Status.Skipped
        : Status.Scheduled;
}
