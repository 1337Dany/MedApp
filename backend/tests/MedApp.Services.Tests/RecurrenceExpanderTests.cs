using MedApp.Models.Models.Enums;
using MedApp.Services.Planning;
using static MedApp.Services.Tests.PlannerFixtures;

namespace MedApp.Services.Tests;

public class RecurrenceExpanderTests
{
    private static readonly DateTime WeekStart = Monday.Date;

    [Fact]
    public void Weekly_series_occurs_on_its_days_from_its_start_until_its_end()
    {
        var entry = new TimetableEntry("Lecture", 2, WeekStart.AddDays(-7).AddHours(9), 90, false,
            Frequency.Weekly, new[] { DayOfWeekEnum.Monday, DayOfWeekEnum.Wednesday }, DateOnly.FromDateTime(WeekStart.AddDays(2)));

        var starts = RecurrenceExpander.Occurrences(entry, WeekStart, WeekStart.AddDays(7)).ToList();

        Assert.Equal(new[] { WeekStart.AddHours(9), WeekStart.AddDays(2).AddHours(9) }, starts);
    }

    [Fact]
    public void Daily_series_does_not_start_before_its_first_day()
    {
        var entry = new TimetableEntry("Lunch", 6, WeekStart.AddDays(3).AddHours(12), 45, false, Frequency.Daily);

        var starts = RecurrenceExpander.Occurrences(entry, WeekStart, WeekStart.AddDays(7)).ToList();

        Assert.Equal(4, starts.Count);
        Assert.Equal(WeekStart.AddDays(3).AddHours(12), starts[0]);
    }

    [Fact]
    public void Occurrence_crossing_midnight_into_the_range_is_included()
    {
        var entry = new TimetableEntry("Sleep", 7, WeekStart.AddDays(-5).AddHours(23), 480, false, Frequency.Daily);

        var first = RecurrenceExpander.Expand(new[] { entry }, WeekStart, WeekStart.AddDays(1)).First();

        Assert.Equal(WeekStart.AddDays(-1).AddHours(23), first.Start);
        Assert.Equal(WeekStart.AddHours(7), first.End);
    }

    [Fact]
    public void One_off_activity_is_returned_once_when_it_overlaps()
    {
        var entry = new TimetableEntry("Exam", 9, WeekStart.AddHours(10), 120, false);

        Assert.Single(RecurrenceExpander.Occurrences(entry, WeekStart, WeekStart.AddDays(1)));
        Assert.Empty(RecurrenceExpander.Occurrences(entry, WeekStart.AddDays(1), WeekStart.AddDays(2)));
    }
}
