using MedApp.Models.Models.Enums;

namespace MedApp.Services.Planning;

// Same rules as the frontend (frontend/src/utils/recurrence.ts): a series repeats at the local time of
// day of its start, from its start date until Until (inclusive), daily or on the listed weekdays.
public static class RecurrenceExpander
{
    public static IEnumerable<BusyBlock> Expand(IEnumerable<TimetableEntry> entries, DateTime from, DateTime to)
    {
        foreach (var entry in entries)
        {
            foreach (var start in Occurrences(entry, from, to))
            {
                yield return new BusyBlock(start, start.AddMinutes(entry.DurationMinutes), entry.Title,
                    entry.ActivityTypeId, entry.IsNegotiable);
            }
        }
    }

    public static IEnumerable<DateTime> Occurrences(TimetableEntry entry, DateTime from, DateTime to)
    {
        var duration = TimeSpan.FromMinutes(entry.DurationMinutes);

        if (entry.Frequency is null)
        {
            if (entry.Start < to && entry.Start + duration > from)
            {
                yield return entry.Start;
            }
            yield break;
        }

        var weekdays = entry.Frequency == Frequency.Weekly && entry.DaysOfWeek is { Count: > 0 }
            ? entry.DaysOfWeek.ToHashSet()
            : new HashSet<DayOfWeekEnum> { ToDayOfWeekEnum(entry.Start.DayOfWeek) };

        // One day early so an occurrence crossing midnight into the range is included.
        var day = (entry.Start > from ? entry.Start : from.AddDays(-1)).Date;
        for (; day < to; day = day.AddDays(1))
        {
            if (day < entry.Start.Date)
            {
                continue;
            }

            if (entry.Until is not null && DateOnly.FromDateTime(day) > entry.Until)
            {
                yield break;
            }

            if (entry.Frequency == Frequency.Weekly && !weekdays.Contains(ToDayOfWeekEnum(day.DayOfWeek)))
            {
                continue;
            }

            var start = day + entry.Start.TimeOfDay;
            if (start < to && start + duration > from)
            {
                yield return start;
            }
        }
    }

    public static DayOfWeekEnum ToDayOfWeekEnum(DayOfWeek day) =>
        day == DayOfWeek.Sunday ? DayOfWeekEnum.Sunday : (DayOfWeekEnum)(int)day;
}
