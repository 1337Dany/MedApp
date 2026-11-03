using System.Net;
using MedApp.API.Tests.Infrastructure;
using MedApp.DAL.Context;
using MedApp.Services.Repositories;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace MedApp.API.Tests;

// The occurrence history behind the calendar and the student's analytics (docs/ANALYTICS.md).
[Collection(ApiCollection.Name)]
public class HistoryTests
{
    private record OccurrenceDto(Guid? ActivityId, Guid? SubjectId, string Title, int ActivityTypeId, DateTime StartTime,
        int DurationMinutes, string Status, Guid? Id = null);

    private static readonly object Daily = new { frequency = "daily", daysOfWeek = Array.Empty<string>(), until = (string?)null };

    private readonly ApiFactory _factory;

    public HistoryTests(ApiFactory factory)
    {
        _factory = factory;
    }

    private static DateTime Today => DateTime.UtcNow.Date;

    private static object Activity(DateTime startUtc, object? recurrence = null, string title = "Session", int duration = 60,
        Guid? subjectId = null) => new
        {
            subjectId,
            topicId = (Guid?)null,
            title,
            activityTypeId = 1,
            priority = 3,
            startTime = startUtc.ToString("O"),
            durationMinutes = duration,
            isRecurring = recurrence is not null,
            recurrence,
            isNegotiable = true,
            status = "scheduled"
        };

    private static async Task<ActivityDto> CreateAsync(HttpClient client, object activity) =>
        await (await client.PostJsonAsync("/api/activities", activity)).ReadAsync<ActivityDto>();

    private static async Task<List<OccurrenceDto>> OccurrencesAsync(HttpClient client, DateTime from, DateTime to) =>
        await (await client.GetAsync(
                $"/api/occurrences?from={Uri.EscapeDataString(from.ToString("O"))}&to={Uri.EscapeDataString(to.ToString("O"))}&timeZone=UTC"))
            .ReadAsync<List<OccurrenceDto>>();

    [Fact]
    public async Task Editing_a_series_changes_only_its_occurrences_after_now()
    {
        var client = await TestClient.CreateUserClientAsync(_factory);
        var start = Today.AddDays(-3).AddHours(6);
        var series = await CreateAsync(client, Activity(start, Daily));

        var before = await OccurrencesAsync(client, Today.AddDays(-7), Today.AddDays(3));
        Assert.Equal(Enumerable.Range(0, 6).Select(i => start.AddDays(i)), before.Select(o => o.StartTime));

        var editedAt = DateTime.UtcNow;
        (await client.PutJsonAsync($"/api/activities/{series.Id}", Activity(start, Daily, "Renamed", 120)))
            .EnsureSuccessStatusCode();

        var after = await OccurrencesAsync(client, Today.AddDays(-7), Today.AddDays(3));
        Assert.Equal(before.Select(o => o.StartTime), after.Select(o => o.StartTime));
        Assert.All(after, o =>
        {
            Assert.Equal(series.Id, o.ActivityId);
            var past = o.StartTime < editedAt;
            Assert.Equal(past ? "Session" : "Renamed", o.Title);
            Assert.Equal(past ? 60 : 120, o.DurationMinutes);
        });
    }

    [Fact]
    public async Task One_occurrence_of_a_series_can_be_marked_without_changing_the_series()
    {
        var client = await TestClient.CreateUserClientAsync(_factory);
        var start = Today.AddDays(-3).AddHours(6);
        var series = await CreateAsync(client, Activity(start, Daily));
        var yesterday = start.AddDays(2);
        var tomorrow = start.AddDays(4);

        var marked = await client.PatchJsonAsync($"/api/activities/{series.Id}/status",
            new { status = "done", occurrenceStart = yesterday.ToString("O") });
        Assert.Equal("scheduled", (await marked.ReadAsync<ActivityDto>()).Status);
        (await client.PatchJsonAsync($"/api/activities/{series.Id}/status",
            new { status = "skipped", occurrenceStart = tomorrow.ToString("O") })).EnsureSuccessStatusCode();

        var notAnOccurrence = await client.PatchJsonAsync($"/api/activities/{series.Id}/status",
            new { status = "done", occurrenceStart = yesterday.AddHours(1).ToString("O") });
        Assert.Equal(HttpStatusCode.BadRequest, notAnOccurrence.StatusCode);

        var occurrences = await OccurrencesAsync(client, Today.AddDays(-7), Today.AddDays(3));
        Assert.Equal("done", occurrences.Single(o => o.StartTime == yesterday).Status);
        Assert.Equal("skipped", occurrences.Single(o => o.StartTime == tomorrow).Status);
        Assert.Equal(4, occurrences.Count(o => o.Status == "scheduled"));

        // Moving the series drops the marks of its future occurrences; the past keeps them.
        (await client.PutJsonAsync($"/api/activities/{series.Id}", Activity(start.AddHours(1), Daily)))
            .EnsureSuccessStatusCode();
        occurrences = await OccurrencesAsync(client, Today.AddDays(-7), Today.AddDays(3));
        Assert.Equal("done", occurrences.Single(o => o.StartTime == yesterday).Status);
        Assert.DoesNotContain(occurrences, o => o.Status == "skipped");
        Assert.Contains(occurrences, o => o.StartTime == tomorrow.AddHours(1));
    }

    [Fact]
    public async Task One_occurrence_of_a_series_can_be_deleted_and_the_rest_of_the_series_stays()
    {
        var client = await TestClient.CreateUserClientAsync(_factory);
        var start = Today.AddDays(-3).AddHours(6);
        var series = await CreateAsync(client, Activity(start, Daily));
        var yesterday = start.AddDays(2);
        var tomorrow = start.AddDays(4);
        string Occurrence(DateTime at) => $"/api/activities/{series.Id}?occurrenceStart={Uri.EscapeDataString(at.ToString("O"))}";

        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync(Occurrence(yesterday))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync(Occurrence(tomorrow))).StatusCode);

        // Not an occurrence, already deleted, or out of range.
        Assert.Equal(HttpStatusCode.BadRequest, (await client.DeleteAsync(Occurrence(yesterday.AddHours(1)))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.DeleteAsync(Occurrence(tomorrow))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PatchJsonAsync($"/api/activities/{series.Id}/status",
            new { status = "done", occurrenceStart = tomorrow.ToString("O") })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await client.DeleteAsync($"/api/activities/{series.Id}?occurrenceStart=0001-01-01T00:00:00Z")).StatusCode);

        // A new title keeps the deletions; the series itself stays.
        (await client.PutJsonAsync($"/api/activities/{series.Id}", Activity(start, Daily, "Renamed"))).EnsureSuccessStatusCode();
        var occurrences = await OccurrencesAsync(client, Today.AddDays(-7), Today.AddDays(3));
        Assert.Equal(Enumerable.Range(0, 6).Select(i => start.AddDays(i)).Where(s => s != yesterday && s != tomorrow),
            occurrences.Select(o => o.StartTime));
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync($"/api/activities/{series.Id}")).StatusCode);

        // A one-off at the time of the deleted occurrence is shown.
        (await client.PutJsonAsync($"/api/activities/{series.Id}", OneOff(yesterday))).EnsureSuccessStatusCode();
        Assert.Equal(series.Id, Assert.Single(await OccurrencesAsync(client, yesterday, yesterday.AddMinutes(1))).ActivityId);

        // With an occurrence start, a one-off activity is deleted as a whole.
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync(Occurrence(yesterday))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/activities/{series.Id}")).StatusCode);
    }

    [Fact]
    public async Task Deleting_an_activity_or_subject_removes_all_its_occurrences()
    {
        var client = await TestClient.CreateUserClientAsync(_factory);
        var series = await CreateAsync(client, Activity(Today.AddDays(-3).AddHours(6), Daily));
        var oneOff = await CreateAsync(client, Activity(Today.AddDays(-1).AddHours(15)));
        var kept = await CreateAsync(client, Activity(Today.AddDays(-1).AddHours(20), title: "Kept"));

        var subject = await (await client.PostJsonAsync("/api/subjects", TestClient.Subject())).ReadAsync<SubjectDto>();
        await CreateAsync(client, Activity(Today.AddDays(-2).AddHours(18), Daily, title: "Anatomy", subjectId: subject.Id));

        // Recorded before they are deleted.
        Assert.Contains(await OccurrencesAsync(client, Today.AddDays(-7), Today.AddDays(3)), o => o.Title == "Anatomy");

        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/activities/{series.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/activities/{oneOff.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/subjects/{subject.Id}")).StatusCode);

        var left = await OccurrencesAsync(client, Today.AddDays(-7), Today.AddDays(3));
        Assert.Equal(kept.Id, Assert.Single(left).ActivityId);
    }

    [Fact]
    public async Task Detached_history_can_be_deleted_only_by_its_owner()
    {
        var client = await TestClient.CreateUserClientAsync(_factory);
        var start = Today.AddDays(-3).AddHours(6);
        var series = await CreateAsync(client, Activity(start, Daily));
        var linked = (await OccurrencesAsync(client, Today.AddDays(-7), Today)).First();
        Assert.Equal(HttpStatusCode.NotFound, (await client.DeleteAsync($"/api/occurrences/{linked.Id}")).StatusCode);

        // A series that becomes a one-off leaves its other past occurrences on their own.
        (await client.PutJsonAsync($"/api/activities/{series.Id}", Activity(start))).EnsureSuccessStatusCode();
        var detached = (await OccurrencesAsync(client, Today.AddDays(-7), Today)).First(o => o.ActivityId is null);

        var stranger = await TestClient.CreateUserClientAsync(_factory);
        Assert.Equal(HttpStatusCode.NotFound, (await stranger.DeleteAsync($"/api/occurrences/{detached.Id}")).StatusCode);

        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/occurrences/{detached.Id}")).StatusCode);
        Assert.DoesNotContain(await OccurrencesAsync(client, Today.AddDays(-7), Today), o => o.Id == detached.Id);
    }

    [Fact]
    public async Task Demo_data_is_saved_once_by_the_server_and_only_into_an_empty_account()
    {
        var client = await TestClient.CreateUserClientAsync(_factory);

        var response = await client.PostJsonAsync("/api/onboarding/demo-data", new { timeZone = "Europe/Warsaw" });
        response.EnsureSuccessStatusCode();
        Assert.True((await response.ReadAsync<UserDto>()).SetupCompleted);

        var subjects = await (await client.GetAsync("/api/subjects")).ReadAsync<List<SubjectDto>>();
        var topics = await (await client.GetAsync("/api/topics")).ReadAsync<List<TopicDto>>();
        var activities = await (await client.GetAsync("/api/activities")).ReadAsync<List<ActivityDto>>();
        Assert.Equal(4, subjects.Count);
        Assert.Equal(17, topics.Count);
        Assert.Equal(13, activities.Count);

        Assert.Equal(HttpStatusCode.BadRequest,
            (await client.PostJsonAsync("/api/onboarding/demo-data", new { timeZone = "Europe/Warsaw" })).StatusCode);
        Assert.Equal(4, (await (await client.GetAsync("/api/subjects")).ReadAsync<List<SubjectDto>>()).Count);

        // Every demo activity can be deleted, and then it is gone from the occurrences too.
        var occurrences = await OccurrencesAsync(client, Today.AddDays(-7), Today.AddDays(7));
        Assert.Contains(occurrences, o => o.Title == "Breakfast");
        var breakfast = activities.Single(a => a.Title == "Breakfast");
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/activities/{breakfast.Id}")).StatusCode);
        Assert.DoesNotContain(await OccurrencesAsync(client, Today.AddDays(-7), Today.AddDays(7)), o => o.Title == "Breakfast");
    }

    [Fact]
    public async Task Demo_data_is_refused_when_the_account_has_data_and_complete_is_remembered()
    {
        var client = await TestClient.CreateUserClientAsync(_factory);
        await CreateAsync(client, Activity(Today.AddDays(1).AddHours(6)));
        Assert.Equal(HttpStatusCode.BadRequest,
            (await client.PostJsonAsync("/api/onboarding/demo-data", new { timeZone = "UTC" })).StatusCode);

        var fresh = await TestClient.CreateUserClientAsync(_factory);
        Assert.False((await (await fresh.GetAsync("/api/auth/me")).ReadAsync<UserDto>()).SetupCompleted);
        (await fresh.PostAsync("/api/onboarding/complete", null)).EnsureSuccessStatusCode();
        Assert.True((await (await fresh.GetAsync("/api/auth/me")).ReadAsync<UserDto>()).SetupCompleted);
    }

    [Fact]
    public async Task Parallel_requests_record_each_occurrence_once()
    {
        var client = await TestClient.CreateUserClientAsync(_factory);
        await CreateAsync(client, Activity(Today.AddDays(-30).AddHours(23), Daily));

        var results = await Task.WhenAll(Enumerable.Range(0, 6)
            .Select(_ => OccurrencesAsync(client, Today.AddDays(-40), Today.AddDays(2))));

        Assert.All(results, r => Assert.Equal(results[0].Select(o => o.StartTime), r.Select(o => o.StartTime)));
        Assert.Equal(32, results[0].Count);
    }

    [Fact]
    public async Task Occurrences_are_private_and_the_range_is_validated()
    {
        var owner = await TestClient.CreateUserClientAsync(_factory);
        var other = await TestClient.CreateUserClientAsync(_factory);
        await CreateAsync(owner, Activity(Today.AddDays(-1).AddHours(9), Daily));

        Assert.NotEmpty(await OccurrencesAsync(owner, Today.AddDays(-2), Today.AddDays(2)));
        Assert.Empty(await OccurrencesAsync(other, Today.AddDays(-2), Today.AddDays(2)));

        var reversed = await owner.GetAsync($"/api/occurrences?from={Today:O}&to={Today.AddDays(-1):O}");
        Assert.Equal(HttpStatusCode.BadRequest, reversed.StatusCode);
        var tooLong = await owner.GetAsync($"/api/occurrences?from={Today:O}&to={Today.AddDays(500):O}");
        Assert.Equal(HttpStatusCode.BadRequest, tooLong.StatusCode);
    }

    // A zone where it is around noon now, so these tests have earlier and later hours today at any time of the day.
    private static (string Zone, int OffsetHours) MiddayZone()
    {
        var offset = 12 - DateTime.UtcNow.Hour;
        // Etc/GMT signs are inverted: Etc/GMT-5 is UTC+5.
        return (offset <= 0 ? $"Etc/GMT+{-offset}" : $"Etc/GMT-{offset}", offset);
    }

    private static async Task<List<OccurrenceDto>> OccurrencesInAsync(HttpClient client, string zone, DateTime from, DateTime to) =>
        await (await client.GetAsync(
                $"/api/occurrences?from={Uri.EscapeDataString(from.ToString("O"))}&to={Uri.EscapeDataString(to.ToString("O"))}&timeZone={Uri.EscapeDataString(zone)}"))
            .ReadAsync<List<OccurrenceDto>>();

    [Fact]
    public async Task Moving_a_series_to_an_earlier_time_that_has_passed_keeps_todays_occurrence()
    {
        var (zone, offset) = MiddayZone();
        var client = await TestClient.CreateUserClientAsync(_factory);
        var today = DateTime.UtcNow.AddHours(offset).Date.AddHours(-offset); // local midnight in UTC
        var series = await CreateAsync(client, Activity(today.AddDays(-3).AddHours(20), Daily));
        await OccurrencesInAsync(client, zone, today.AddDays(-7), today.AddDays(3));

        var earlier = today.AddDays(-3).AddHours(6);
        (await client.PutJsonAsync($"/api/activities/{series.Id}", Activity(earlier, Daily))).EnsureSuccessStatusCode();

        var todays = await OccurrencesInAsync(client, zone, today, today.AddDays(1));
        var occurrence = Assert.Single(todays);
        Assert.Equal(today.AddHours(6), occurrence.StartTime);
        Assert.Equal(series.Id, occurrence.ActivityId);

        var week = await OccurrencesInAsync(client, zone, today.AddDays(-3), today.AddDays(2));
        Assert.Equal(5, week.Count);
    }

    [Fact]
    public async Task Moving_a_series_after_todays_occurrence_ran_does_not_count_today_twice()
    {
        var (zone, offset) = MiddayZone();
        var client = await TestClient.CreateUserClientAsync(_factory);
        var today = DateTime.UtcNow.AddHours(offset).Date.AddHours(-offset);
        var series = await CreateAsync(client, Activity(today.AddDays(-3).AddHours(7), Daily));
        await OccurrencesInAsync(client, zone, today.AddDays(-7), today.AddDays(3));

        // Another time that has also passed: today's occurrence already happened at the old time.
        (await client.PutJsonAsync($"/api/activities/{series.Id}", Activity(today.AddDays(-3).AddHours(6), Daily)))
            .EnsureSuccessStatusCode();

        var occurrence = Assert.Single(await OccurrencesInAsync(client, zone, today, today.AddDays(1)));
        Assert.Equal(today.AddHours(7), occurrence.StartTime);
    }

    [Fact]
    public async Task Turning_a_series_into_a_one_off_does_not_count_its_first_occurrence_twice()
    {
        var client = await TestClient.CreateUserClientAsync(_factory);
        var start = Today.AddDays(-3).AddHours(-1);
        var series = await CreateAsync(client, Activity(start, Daily));
        var before = await OccurrencesAsync(client, Today.AddDays(-7), Today);
        Assert.Equal(4, before.Count);

        (await client.PutJsonAsync($"/api/activities/{series.Id}", Activity(start))).EnsureSuccessStatusCode();

        var after = await OccurrencesAsync(client, Today.AddDays(-7), Today);
        Assert.Equal(before.Select(o => o.StartTime), after.Select(o => o.StartTime));
        Assert.Equal(series.Id, after.Single(o => o.StartTime == start).ActivityId);
        Assert.All(after.Where(o => o.StartTime != start), o => Assert.Null(o.ActivityId));

        // It is the one-off's own entry now: deleting that removes it, the detached rest stays.
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/activities/{series.Id}")).StatusCode);
        var left = await OccurrencesAsync(client, Today.AddDays(-7), Today);
        Assert.Equal(before.Skip(1).Select(o => o.StartTime), left.Select(o => o.StartTime));
    }

    [Fact]
    public async Task Parallel_reads_and_writes_do_not_fail_or_record_twice()
    {
        var client = await TestClient.CreateUserClientAsync(_factory);
        var start = Today.AddDays(-2).AddHours(1);

        for (var round = 0; round < 10; round++)
        {
            var oneOff = await CreateAsync(client, Activity(start, title: $"R{round}"));
            var series = await CreateAsync(client, Activity(start, Daily, $"S{round}"));
            var marked = await CreateAsync(client, Activity(start, Daily, $"M{round}"));

            Task<HttpResponseMessage> Read() => client.GetAsync(
                $"/api/occurrences?from={Uri.EscapeDataString(Today.AddDays(-5).ToString("O"))}&to={Uri.EscapeDataString(Today.AddDays(5).ToString("O"))}&timeZone=UTC");

            var responses = await Task.WhenAll(
                Read(),
                client.DeleteAsync($"/api/activities/{series.Id}"),
                Read(),
                client.PutJsonAsync($"/api/activities/{oneOff.Id}", Activity(start, title: $"E{round}", duration: 45)),
                client.PatchJsonAsync($"/api/activities/{marked.Id}/status", new { status = "done", occurrenceStart = start.ToString("O") }),
                Read(),
                client.DeleteAsync($"/api/activities/{marked.Id}"),
                Read());

            Assert.All(responses, r => Assert.True((int)r.StatusCode < 500, $"{r.RequestMessage?.Method} {r.RequestMessage?.RequestUri}: {(int)r.StatusCode}"));
        }

        var rows = await OccurrencesAsync(client, Today.AddDays(-5), Today.AddDays(5));
        var linked = rows.Where(o => o.ActivityId is not null).ToList();
        Assert.Equal(linked.Count, linked.Select(o => (o.ActivityId, o.StartTime)).Distinct().Count());
        Assert.Equal(10, rows.Count(o => o.Title.StartsWith('E')));
    }

    private async Task<(HttpClient Client, ActivityDto Series, DateTime Start)> MarkedSeriesAsync(DateTime start, DateTime markAt, string status = "done")
    {
        var client = await TestClient.CreateUserClientAsync(_factory);
        var series = await CreateAsync(client, Activity(start, Daily));
        (await client.PatchJsonAsync($"/api/activities/{series.Id}/status", new { status, occurrenceStart = markAt.ToString("O") }))
            .EnsureSuccessStatusCode();
        return (client, series, start);
    }

    private static object OneOff(DateTime start, string status = "scheduled") => new
    {
        subjectId = (Guid?)null,
        topicId = (Guid?)null,
        title = "Session",
        activityTypeId = 1,
        priority = 3,
        startTime = start.ToString("O"),
        durationMinutes = 60,
        isRecurring = false,
        recurrence = (object?)null,
        isNegotiable = true,
        status
    };

    [Fact]
    public async Task A_one_off_made_from_a_series_takes_the_mark_of_the_occurrence_at_its_start()
    {
        var start = Today.AddDays(-3).AddHours(6);
        var (client, series, _) = await MarkedSeriesAsync(start, start);

        var updated = await (await client.PutJsonAsync($"/api/activities/{series.Id}", OneOff(start))).ReadAsync<ActivityDto>();

        Assert.Equal("done", updated.Status);
        var rows = await OccurrencesAsync(client, start, start.AddMinutes(1));
        Assert.Equal("done", Assert.Single(rows).Status);
    }

    [Fact]
    public async Task An_explicit_status_in_the_form_wins_over_the_mark()
    {
        var start = Today.AddDays(-3).AddHours(6);
        var (client, series, _) = await MarkedSeriesAsync(start, start);

        var updated = await (await client.PutJsonAsync($"/api/activities/{series.Id}", OneOff(start, "skipped"))).ReadAsync<ActivityDto>();

        Assert.Equal("skipped", updated.Status);
        Assert.Equal("skipped", Assert.Single(await OccurrencesAsync(client, start, start.AddMinutes(1))).Status);
    }

    [Fact]
    public async Task A_one_off_moved_onto_a_marked_occurrence_takes_its_mark()
    {
        var start = Today.AddDays(-3).AddHours(6);
        var marked = start.AddDays(1);
        var (client, series, _) = await MarkedSeriesAsync(start, marked);

        var updated = await (await client.PutJsonAsync($"/api/activities/{series.Id}", OneOff(marked))).ReadAsync<ActivityDto>();

        Assert.Equal("done", updated.Status);
        var row = Assert.Single(await OccurrencesAsync(client, marked, marked.AddMinutes(1)));
        Assert.Equal(series.Id, row.ActivityId);
    }

    [Fact]
    public async Task A_marked_future_first_occurrence_passes_its_mark_to_the_one_off()
    {
        var start = Today.AddDays(2).AddHours(10);
        var (client, series, _) = await MarkedSeriesAsync(start, start);

        var updated = await (await client.PutJsonAsync($"/api/activities/{series.Id}", OneOff(start))).ReadAsync<ActivityDto>();

        Assert.Equal("done", updated.Status);
        Assert.Equal("done", Assert.Single(await OccurrencesAsync(client, start, start.AddMinutes(1))).Status);
    }

    [Fact]
    public async Task A_series_with_seconds_in_its_start_converted_by_the_form_is_not_counted_twice()
    {
        var start = Today.AddDays(-3).AddHours(6).AddSeconds(30);
        var (client, series, _) = await MarkedSeriesAsync(start, start);
        var inForm = start.AddSeconds(-30);

        var updated = await (await client.PutJsonAsync($"/api/activities/{series.Id}", OneOff(inForm))).ReadAsync<ActivityDto>();

        Assert.Equal("done", updated.Status);
        var row = Assert.Single(await OccurrencesAsync(client, inForm, inForm.AddMinutes(1)));
        Assert.Equal(inForm, row.StartTime);
        Assert.Equal("done", row.Status);
    }

    [Fact]
    public async Task A_past_one_off_turned_into_a_series_keeps_its_status_as_a_mark()
    {
        var client = await TestClient.CreateUserClientAsync(_factory);
        var start = Today.AddDays(-3).AddHours(6);
        var oneOff = await CreateAsync(client, OneOff(start, "done"));
        await OccurrencesAsync(client, start, start.AddMinutes(1));

        (await client.PutJsonAsync($"/api/activities/{oneOff.Id}", new
        {
            subjectId = (Guid?)null,
            topicId = (Guid?)null,
            title = "Session",
            activityTypeId = 1,
            priority = 3,
            startTime = start.ToString("O"),
            durationMinutes = 60,
            isRecurring = true,
            recurrence = Daily,
            isNegotiable = true,
            status = "done"
        })).EnsureSuccessStatusCode();

        var rows = await OccurrencesAsync(client, start, start.AddDays(3));
        Assert.Equal(3, rows.Count);
        Assert.All(rows, o => Assert.Equal(oneOff.Id, o.ActivityId));
        Assert.Equal("done", rows[0].Status);
        Assert.All(rows.Skip(1), o => Assert.Equal("scheduled", o.Status));
    }

    [Theory]
    [InlineData("0002-01-01T00:00:00Z")]
    [InlineData("0001-01-01T00:00:01Z")]
    [InlineData("1999-12-31T23:00:00Z")]
    [InlineData("9999-12-31T23:59:59Z")]
    public async Task Extreme_dates_are_refused_and_the_account_keeps_working(string date)
    {
        var client = await TestClient.CreateUserClientAsync(_factory);
        var start = DateTime.Parse(date, null, System.Globalization.DateTimeStyles.AdjustToUniversal | System.Globalization.DateTimeStyles.AssumeUniversal);

        Assert.Equal(HttpStatusCode.BadRequest,
            (await client.PostJsonAsync("/api/activities", Activity(start, Daily))).StatusCode);

        var series = await CreateAsync(client, Activity(Today.AddDays(-1).AddHours(6), Daily));
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PatchJsonAsync($"/api/activities/{series.Id}/status",
            new { status = "done", occurrenceStart = date })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync(
            $"/api/occurrences?from={Uri.EscapeDataString(date)}&to={Uri.EscapeDataString((start.Year > 9000 ? start : start.AddDays(1)).ToString("O"))}")).StatusCode);
        Assert.NotEmpty(await OccurrencesAsync(client, Today.AddDays(-2), Today.AddDays(2)));
    }

    [Fact]
    public async Task The_end_of_a_series_has_the_same_bounds_and_an_edit_keeping_valid_dates_passes()
    {
        var client = await TestClient.CreateUserClientAsync(_factory);
        var start = Today.AddDays(-1).AddHours(6);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostJsonAsync("/api/activities",
            Activity(start, new { frequency = "daily", daysOfWeek = Array.Empty<string>(), until = "9000-01-01" }))).StatusCode);

        var until = new { frequency = "daily", daysOfWeek = Array.Empty<string>(), until = Today.AddYears(9).ToString("yyyy-MM-dd") };
        var series = await CreateAsync(client, Activity(start, until));
        (await client.PutJsonAsync($"/api/activities/{series.Id}", Activity(start, until, "Renamed"))).EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task A_stored_start_from_before_the_accepted_dates_does_not_break_the_account()
    {
        var client = await TestClient.CreateUserClientAsync(_factory);
        var series = await CreateAsync(client, Activity(Today.AddDays(-1).AddHours(6), Daily));
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<MedAppDbContext>();
            await db.Activities.Where(a => a.ActivityId == series.Id).ExecuteUpdateAsync(s =>
                s.SetProperty(a => a.StartTime, new DateTime(1, 1, 1, 0, 0, 1, DateTimeKind.Utc)));
        }

        var rows = await OccurrencesAsync(client, new DateTime(2000, 1, 1, 0, 0, 0, DateTimeKind.Utc), new DateTime(2000, 1, 10, 0, 0, 0, DateTimeKind.Utc));

        Assert.Equal(9, rows.Count);
    }

    [Fact]
    public async Task A_read_that_waits_too_long_for_the_users_lock_gets_503()
    {
        var client = await TestClient.CreateUserClientAsync(_factory);
        var me = await (await client.GetAsync("/api/auth/me")).ReadAsync<UserDto>();

        using var scope = _factory.Services.CreateScope();
        var uow = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
        await using var holder = await uow.BeginTransactionAsync();
        await scope.ServiceProvider.GetRequiredService<IActivityOccurrenceRepository>().LockUserHistoryAsync(me.Id);

        var response = await client.GetAsync(
            $"/api/occurrences?from={Uri.EscapeDataString(Today.ToString("O"))}&to={Uri.EscapeDataString(Today.AddDays(1).ToString("O"))}");

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }

    [Fact]
    public async Task Requests_of_one_user_above_the_limit_get_429_and_others_are_not_affected()
    {
        await using var limited = _factory.WithWebHostBuilder(b =>
        {
            b.UseSetting("RateLimiting:UserPermitLimit", "1");
            b.UseSetting("RateLimiting:UserQueueLimit", "0");
        });
        var client = await TestClient.CreateUserClientAsync(limited);
        var other = await TestClient.CreateUserClientAsync(limited);

        // The first request stays in progress while it waits for the user's lock.
        var me = await (await client.GetAsync("/api/auth/me")).ReadAsync<UserDto>();
        using var scope = _factory.Services.CreateScope();
        await using var holder = await scope.ServiceProvider.GetRequiredService<IUnitOfWork>().BeginTransactionAsync();
        await scope.ServiceProvider.GetRequiredService<IActivityOccurrenceRepository>().LockUserHistoryAsync(me.Id);
        var url = $"/api/occurrences?from={Uri.EscapeDataString(Today.ToString("O"))}&to={Uri.EscapeDataString(Today.AddDays(1).ToString("O"))}";
        var waiting = client.GetAsync(url);
        await Task.Delay(1000);

        Assert.Equal(HttpStatusCode.TooManyRequests, (await client.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await other.GetAsync("/api/auth/me")).StatusCode);

        await holder.DisposeAsync();
        Assert.Equal(HttpStatusCode.OK, (await waiting).StatusCode);
    }
}
