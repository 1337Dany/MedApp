using System.Net;
using MedApp.API.Tests.Infrastructure;

namespace MedApp.API.Tests;

// The occurrence history behind the calendar and the student's analytics (docs/ANALYTICS.md).
[Collection(ApiCollection.Name)]
public class HistoryTests
{
    private record OccurrenceDto(Guid? ActivityId, Guid? SubjectId, string Title, int ActivityTypeId, DateTime StartTime,
        int DurationMinutes, string Status);

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
    public async Task Deleting_keeps_the_past_of_a_series_but_not_a_one_off_activity()
    {
        var client = await TestClient.CreateUserClientAsync(_factory);
        var start = Today.AddDays(-3).AddHours(6);
        var series = await CreateAsync(client, Activity(start, Daily));
        var oneOff = await CreateAsync(client, Activity(Today.AddDays(-1).AddHours(15)));

        var subject = await (await client.PostJsonAsync("/api/subjects", TestClient.Subject())).ReadAsync<SubjectDto>();
        await CreateAsync(client, Activity(Today.AddDays(-2).AddHours(18), title: "Anatomy", subjectId: subject.Id));

        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/activities/{series.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/activities/{oneOff.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/subjects/{subject.Id}")).StatusCode);

        var occurrences = await OccurrencesAsync(client, Today.AddDays(-7), Today.AddDays(3));
        Assert.All(occurrences, o => Assert.True(o.StartTime < DateTime.UtcNow));
        Assert.All(occurrences, o => Assert.Null(o.ActivityId));
        Assert.Equal(3, occurrences.Count(o => o.Title == "Session" && o.StartTime < Today));
        Assert.Contains(occurrences, o => o.Title == "Anatomy" && o.SubjectId is null);
        Assert.DoesNotContain(occurrences, o => o.StartTime == Today.AddDays(-1).AddHours(15));
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
}
