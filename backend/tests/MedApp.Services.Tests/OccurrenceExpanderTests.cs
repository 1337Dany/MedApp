using MedApp.Models.Models;
using MedApp.Models.Models.Enums;
using MedApp.Services.History;

namespace MedApp.Services.Tests;

public class OccurrenceExpanderTests
{
    private static readonly TimeZoneInfo Warsaw = TimeZoneInfo.FindSystemTimeZoneById("Europe/Warsaw");

    private static Activity Series(DateTime startUtc, Frequency frequency, params DayOfWeekEnum[] days)
    {
        var options = new RecurringOptions { Frequency = frequency };
        foreach (var day in days)
        {
            options.DaysOfWeek.Add(new OptionsDayOfWeek { DayOfWeek = day });
        }

        return new Activity
        {
            ActivityId = Guid.NewGuid(),
            Title = "Series",
            ActivityTypeId = 2,
            StartTime = startUtc,
            DurationMinutes = 60,
            IsRecurring = true,
            RecurringOptions = options,
            Status = Status.Scheduled
        };
    }

    private static DateTime Utc(int year, int month, int day, int hour, int minute = 0) =>
        new(year, month, day, hour, minute, 0, DateTimeKind.Utc);

    [Fact]
    public void Weekly_series_repeats_on_its_local_weekdays_even_when_the_utc_day_differs()
    {
        // Monday 5 Oct 2026, 00:30 in Warsaw is Sunday 22:30 UTC.
        var series = Series(Utc(2026, 10, 4, 22, 30), Frequency.Weekly, DayOfWeekEnum.Monday);

        var starts = OccurrenceExpander.StartsUtc(series, Utc(2026, 10, 1, 0), Utc(2026, 10, 20, 0), Warsaw).ToList();

        Assert.Equal(new[] { Utc(2026, 10, 4, 22, 30), Utc(2026, 10, 11, 22, 30), Utc(2026, 10, 18, 22, 30) }, starts);
    }

    [Fact]
    public void Daily_series_keeps_its_local_time_across_the_change_to_winter_time()
    {
        // 09:00 in Warsaw: 07:00 UTC in summer time, 08:00 UTC after 25 Oct 2026.
        var series = Series(Utc(2026, 10, 23, 7), Frequency.Daily);

        var starts = OccurrenceExpander.StartsUtc(series, Utc(2026, 10, 23, 0), Utc(2026, 10, 27, 0), Warsaw).ToList();

        Assert.Equal(new[] { Utc(2026, 10, 23, 7), Utc(2026, 10, 24, 7), Utc(2026, 10, 25, 8), Utc(2026, 10, 26, 8) }, starts);
    }

    [Fact]
    public void Range_is_half_open_and_a_one_off_activity_occurs_once()
    {
        var series = Series(Utc(2026, 10, 5, 8), Frequency.Daily);
        var oneOff = new Activity { StartTime = Utc(2026, 10, 6, 8), DurationMinutes = 30, Status = Status.Done };

        Assert.Equal(new[] { Utc(2026, 10, 6, 8) },
            OccurrenceExpander.StartsUtc(series, Utc(2026, 10, 6, 8), Utc(2026, 10, 7, 8), Warsaw));
        Assert.Equal(new[] { Utc(2026, 10, 6, 8) },
            OccurrenceExpander.StartsUtc(oneOff, Utc(2026, 10, 6, 0), Utc(2026, 10, 7, 0), Warsaw));
        Assert.Empty(OccurrenceExpander.StartsUtc(oneOff, Utc(2026, 10, 6, 9), Utc(2026, 10, 7, 0), Warsaw));
    }

    [Theory]
    [InlineData(false, Status.Done, Status.Done)]
    [InlineData(true, Status.Done, Status.Scheduled)]
    [InlineData(true, Status.Skipped, Status.Skipped)]
    public void Unmarked_occurrence_status_comes_from_a_one_off_activity_but_only_skipped_from_a_series(
        bool recurring, Status activityStatus, Status expected)
    {
        var activity = recurring ? Series(Utc(2026, 10, 5, 8), Frequency.Daily) : new Activity();
        activity.Status = activityStatus;

        Assert.Equal(expected, OccurrenceExpander.DefaultStatus(activity));
    }
}
