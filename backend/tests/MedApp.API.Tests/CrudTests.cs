using System.Net;
using MedApp.API.Tests.Infrastructure;

namespace MedApp.API.Tests;

[Collection(ApiCollection.Name)]
public class CrudTests
{
    private readonly ApiFactory _factory;

    public CrudTests(ApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Subject_crud_and_cascade_delete()
    {
        var client = await TestClient.CreateUserClientAsync(_factory);

        var created = await client.PostJsonAsync("/api/subjects", TestClient.Subject(examDate: null));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var subject = await created.ReadAsync<SubjectDto>();
        Assert.Null(subject.ExamDate);

        var updated = await (await client.PutJsonAsync($"/api/subjects/{subject.Id}", TestClient.Subject("Physiology", 2)))
            .ReadAsync<SubjectDto>();
        Assert.Equal("Physiology", updated.Name);
        Assert.Equal(2, updated.PlanningMethodId);

        var first = await (await client.PostJsonAsync($"/api/subjects/{subject.Id}/topics", TestClient.Topic("A")))
            .ReadAsync<TopicDto>();
        var second = await (await client.PostJsonAsync($"/api/subjects/{subject.Id}/topics", TestClient.Topic("B", "green")))
            .ReadAsync<TopicDto>();
        Assert.Equal(0, first.Order);
        Assert.Equal(1, second.Order);
        Assert.Equal("green", second.Feedback);

        await client.PostJsonAsync("/api/activities", TestClient.Activity(subject.Id, first.Id));
        var unrelated = await (await client.PostJsonAsync("/api/activities", TestClient.Activity(activityTypeId: 4)))
            .ReadAsync<ActivityDto>();

        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/subjects/{subject.Id}")).StatusCode);

        Assert.Empty(await (await client.GetAsync("/api/topics")).ReadAsync<List<TopicDto>>());
        var remaining = await (await client.GetAsync("/api/activities")).ReadAsync<List<ActivityDto>>();
        Assert.Equal(unrelated.Id, Assert.Single(remaining).Id);
    }

    [Fact]
    public async Task Topic_sets_the_subject_of_an_activity_and_deleting_it_keeps_the_activity()
    {
        var client = await TestClient.CreateUserClientAsync(_factory);
        var subject = await (await client.PostJsonAsync("/api/subjects", TestClient.Subject())).ReadAsync<SubjectDto>();
        var topic = await (await client.PostJsonAsync($"/api/subjects/{subject.Id}/topics", TestClient.Topic()))
            .ReadAsync<TopicDto>();

        var activity = await (await client.PostJsonAsync("/api/activities", TestClient.Activity(topicId: topic.Id)))
            .ReadAsync<ActivityDto>();
        Assert.Equal(subject.Id, activity.SubjectId);

        await client.DeleteAsync($"/api/topics/{topic.Id}");

        var reloaded = await (await client.GetAsync($"/api/activities/{activity.Id}")).ReadAsync<ActivityDto>();
        Assert.Null(reloaded.TopicId);
        Assert.Equal(subject.Id, reloaded.SubjectId);
    }

    [Fact]
    public async Task Activity_recurrence_can_be_changed_and_removed()
    {
        var client = await TestClient.CreateUserClientAsync(_factory);

        var weekly = new { frequency = "weekly", daysOfWeek = new[] { "monday", "wednesday" }, until = "2026-12-31" };
        var activity = await (await client.PostJsonAsync("/api/activities", TestClient.Activity(recurrence: weekly)))
            .ReadAsync<ActivityDto>();
        Assert.True(activity.IsRecurring);
        Assert.Equal(new[] { "monday", "wednesday" }, activity.Recurrence!.DaysOfWeek);

        var changed = new { frequency = "weekly", daysOfWeek = new[] { "wednesday", "friday" }, until = (string?)null };
        activity = await (await client.PutJsonAsync($"/api/activities/{activity.Id}", TestClient.Activity(recurrence: changed)))
            .ReadAsync<ActivityDto>();
        Assert.Equal(new[] { "wednesday", "friday" }, activity.Recurrence!.DaysOfWeek);
        Assert.Null(activity.Recurrence.Until);

        activity = await (await client.PutJsonAsync($"/api/activities/{activity.Id}", TestClient.Activity()))
            .ReadAsync<ActivityDto>();
        Assert.False(activity.IsRecurring);
        Assert.Null(activity.Recurrence);

        var status = await (await client.PatchJsonAsync($"/api/activities/{activity.Id}/status", new { status = "partiallyDone" }))
            .ReadAsync<ActivityDto>();
        Assert.Equal("partiallyDone", status.Status);
    }

    [Fact]
    public async Task Activities_window_includes_recurring_series_that_started_earlier()
    {
        var client = await TestClient.CreateUserClientAsync(_factory);
        var daily = new { frequency = "daily", daysOfWeek = Array.Empty<string>(), until = (string?)null };
        var series = await (await client.PostJsonAsync("/api/activities",
            TestClient.Activity(recurrence: daily, startTime: "2026-01-05T08:00:00Z"))).ReadAsync<ActivityDto>();
        await client.PostJsonAsync("/api/activities", TestClient.Activity(startTime: "2026-01-05T09:00:00Z"));
        var inWindow = await (await client.PostJsonAsync("/api/activities",
            TestClient.Activity(startTime: "2026-03-03T09:00:00Z"))).ReadAsync<ActivityDto>();

        var result = await (await client.GetAsync("/api/activities?from=2026-03-01T00:00:00Z&to=2026-03-08T00:00:00Z"))
            .ReadAsync<List<ActivityDto>>();

        Assert.Equal(new[] { series.Id, inWindow.Id }.OrderBy(x => x), result.Select(a => a.Id).OrderBy(x => x));
    }

    [Fact]
    public async Task Invalid_requests_are_rejected_with_field_errors()
    {
        var client = await TestClient.CreateUserClientAsync(_factory);

        var badSubject = await client.PostJsonAsync("/api/subjects", new
        {
            name = "",
            planningMethodId = 99,
            priority = 11,
            studyMode = "relaxed",
            colorHex = "blue"
        });
        Assert.Equal(HttpStatusCode.BadRequest, badSubject.StatusCode);
        var body = await badSubject.Content.ReadAsStringAsync();
        Assert.Contains("PlanningMethodId", body);
        Assert.Contains("ColorHex", body);

        var weeklyWithoutDays = new { frequency = "weekly", daysOfWeek = Array.Empty<string>() };
        var badActivity = await client.PostJsonAsync("/api/activities", TestClient.Activity(recurrence: weeklyWithoutDays));
        Assert.Equal(HttpStatusCode.BadRequest, badActivity.StatusCode);
    }

    [Fact]
    public async Task Lookups_match_the_seeded_ids()
    {
        var client = await TestClient.CreateUserClientAsync(_factory);

        var strategies = await client.GetStringAsync("/api/study-strategies");
        var types = await client.GetStringAsync("/api/activity-types");

        Assert.Contains("{\"id\":1,\"name\":\"Traffic Light\"}", strategies);
        Assert.Contains("{\"id\":9,\"name\":\"One-Time Event\"}", types);
    }
}
