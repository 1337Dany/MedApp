using System.Net;
using MedApp.API.Tests.Infrastructure;

namespace MedApp.API.Tests;

[Collection(ApiCollection.Name)]
public class PlanningTests
{
    private const string Zone = "Europe/Warsaw";
    private static readonly TimeZoneInfo WarsawZone = TimeZoneInfo.FindSystemTimeZoneById(Zone);

    private readonly ApiFactory _factory;

    public PlanningTests(ApiFactory factory)
    {
        _factory = factory;
    }

    private static Task<PlanResultDto> GenerateAsync(HttpClient client, int days = 7) =>
        client.PostJsonAsync("/api/planning/generate", new { timeZone = Zone, days }).ContinueWith(t => t.Result.ReadAsync<PlanResultDto>()).Unwrap();

    private static DateTime Local(DateTime utc) => TimeZoneInfo.ConvertTimeFromUtc(utc, WarsawZone);

    private static DateTime WarsawToday => Local(DateTime.UtcNow).Date;

    [Fact]
    public async Task Generated_sessions_fit_the_window_avoid_the_timetable_and_replace_the_previous_plan()
    {
        var client = await TestClient.CreateUserClientAsync(_factory);
        var subject = await (await client.PostJsonAsync("/api/subjects", TestClient.Subject(studyMode: "emergency")))
            .ReadAsync<SubjectDto>();
        await client.PostJsonAsync($"/api/subjects/{subject.Id}/topics", TestClient.Topic("Nerves"));
        await client.PostJsonAsync("/api/subjects", TestClient.Subject("Pharmacology", planningMethodId: 3));

        // A daily lecture 09:00-12:00 Warsaw time.
        var lectureStart = TimeZoneInfo.ConvertTimeToUtc(WarsawToday.AddDays(-1).AddHours(9), WarsawZone);
        var daily = new { frequency = "daily", daysOfWeek = Array.Empty<string>(), until = (string?)null };
        var lecture = TestClient.Activity(recurrence: daily, startTime: lectureStart.ToString("O"), activityTypeId: 2);
        var lectureJson = System.Text.Json.JsonSerializer.Serialize(lecture, TestClient.Json)
            .Replace("\"durationMinutes\":60", "\"durationMinutes\":180");
        var lectureResponse = await client.PostAsync("/api/activities",
            new StringContent(lectureJson, System.Text.Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.Created, lectureResponse.StatusCode);

        var plan = await GenerateAsync(client);

        Assert.NotEmpty(plan.Sessions);
        Assert.All(plan.Sessions, s =>
        {
            Assert.True(s.IsAutoPlanned);
            Assert.Equal(subject.Id, s.SubjectId); // the manual subject gets nothing
            Assert.True(s.StartTime >= DateTime.UtcNow.AddMinutes(-1));
            var start = Local(s.StartTime);
            var end = start.AddMinutes(s.DurationMinutes);
            Assert.True(start.TimeOfDay >= TimeSpan.FromHours(8) && end.TimeOfDay <= TimeSpan.FromHours(22) && end.Date == start.Date);
            Assert.False(start.TimeOfDay < TimeSpan.FromHours(12) && end.TimeOfDay > TimeSpan.FromHours(9));
        });
        Assert.True(plan.Sessions.GroupBy(s => Local(s.StartTime).Date).All(g => g.Count() <= 3));

        var again = await GenerateAsync(client);
        var all = await (await client.GetAsync("/api/activities")).ReadAsync<List<ActivityDto>>();
        Assert.Equal(again.Sessions.Count, all.Count(a => a.IsAutoPlanned));
        Assert.DoesNotContain(all, a => plan.Sessions.Any(p => p.Id == a.Id));
    }

    [Fact]
    public async Task Feedback_change_reviews_the_topic_and_replans()
    {
        var client = await TestClient.CreateUserClientAsync(_factory);
        var subject = await (await client.PostJsonAsync("/api/subjects", TestClient.Subject(planningMethodId: 2)))
            .ReadAsync<SubjectDto>();
        var topic = await (await client.PostJsonAsync($"/api/subjects/{subject.Id}/topics", TestClient.Topic("Krebs", "yellow")))
            .ReadAsync<TopicDto>();

        var plan = await GenerateAsync(client);
        Assert.Contains(plan.Sessions, s => s.TopicId == topic.Id && s.DurationMinutes == 30);

        var updated = await (await client.PutJsonAsync($"/api/topics/{topic.Id}", TestClient.Topic("Krebs", "green")))
            .ReadAsync<TopicDto>();
        Assert.NotNull(updated.LastStudied);
        Assert.Equal(3, Math.Round((updated.NextReview!.Value - updated.LastStudied!.Value).TotalDays)); // stage 0 -> 1

        var activities = await (await client.GetAsync("/api/activities")).ReadAsync<List<ActivityDto>>();
        var sessions = activities.Where(a => a.IsAutoPlanned).ToList();
        Assert.DoesNotContain(sessions, s => plan.Sessions.Any(p => p.Id == s.Id));
        // Reviewed just now: the next review is not before its interval.
        Assert.All(sessions, s => Assert.True(Local(s.StartTime).Date >= Local(updated.NextReview.Value).Date));
    }

    [Fact]
    public async Task Finishing_a_session_reviews_its_topic_and_edited_sessions_become_the_students_own()
    {
        var client = await TestClient.CreateUserClientAsync(_factory);
        var subject = await (await client.PostJsonAsync("/api/subjects", TestClient.Subject(studyMode: "determined")))
            .ReadAsync<SubjectDto>();
        var topic = await (await client.PostJsonAsync($"/api/subjects/{subject.Id}/topics", TestClient.Topic("Nerves")))
            .ReadAsync<TopicDto>();
        var plan = await GenerateAsync(client);

        var done = plan.Sessions.First(s => s.TopicId == topic.Id);
        var patched = await (await client.PatchJsonAsync($"/api/activities/{done.Id}/status", new { status = "done" }))
            .ReadAsync<ActivityDto>();
        Assert.Equal("done", patched.Status);
        var reviewed = await (await client.GetAsync($"/api/topics/{topic.Id}")).ReadAsync<TopicDto>();
        Assert.NotNull(reviewed.LastStudied);
        Assert.NotNull(reviewed.NextReview);

        // The finished session is history and survives re-planning.
        var afterDone = await (await client.GetAsync("/api/activities")).ReadAsync<List<ActivityDto>>();
        Assert.Contains(afterDone, a => a.Id == done.Id);

        // Moving a planned session keeps it through re-planning, as the student's own activity.
        var toMove = afterDone.First(a => a.IsAutoPlanned && a.Status == "scheduled");
        var moved = await (await client.PutJsonAsync($"/api/activities/{toMove.Id}", new
        {
            subjectId = toMove.SubjectId,
            topicId = toMove.TopicId,
            title = toMove.Title,
            activityTypeId = 1,
            priority = toMove.Priority,
            startTime = toMove.StartTime.AddDays(10).ToString("O"),
            durationMinutes = toMove.DurationMinutes,
            isRecurring = false,
            isNegotiable = true,
            status = "scheduled"
        })).ReadAsync<ActivityDto>();
        Assert.False(moved.IsAutoPlanned);

        await GenerateAsync(client);
        var afterReplan = await (await client.GetAsync("/api/activities")).ReadAsync<List<ActivityDto>>();
        Assert.Contains(afterReplan, a => a.Id == moved.Id && !a.IsAutoPlanned);
    }

    [Fact]
    public async Task Warnings_report_overload_and_planning_never_touches_other_users()
    {
        var other = await TestClient.CreateUserClientAsync(_factory);
        var otherSubject = await (await other.PostJsonAsync("/api/subjects", TestClient.Subject())).ReadAsync<SubjectDto>();
        var otherPlan = await GenerateAsync(other);

        var client = await TestClient.CreateUserClientAsync(_factory);
        var tomorrowEight = TimeZoneInfo.ConvertTimeToUtc(WarsawToday.AddDays(1).AddHours(8), WarsawZone);
        var shift = System.Text.Json.JsonSerializer.Serialize(
                TestClient.Activity(startTime: tomorrowEight.ToString("O"), activityTypeId: 5), TestClient.Json)
            .Replace("\"durationMinutes\":60", "\"durationMinutes\":660");
        await client.PostAsync("/api/activities", new StringContent(shift, System.Text.Encoding.UTF8, "application/json"));

        var warnings = await (await client.GetAsync($"/api/planning/warnings?timeZone={Uri.EscapeDataString(Zone)}"))
            .ReadAsync<List<PlanningWarningDto>>();
        Assert.Contains(warnings, w => w.Severity == "high" && w.Message.Contains("11 h"));

        await client.PostJsonAsync("/api/subjects", TestClient.Subject("Mine"));
        await GenerateAsync(client);

        var otherActivities = await (await other.GetAsync("/api/activities")).ReadAsync<List<ActivityDto>>();
        Assert.Equal(otherPlan.Sessions.Select(s => s.Id).OrderBy(x => x), otherActivities.Select(a => a.Id).OrderBy(x => x));
        Assert.All(otherActivities, a => Assert.Equal(otherSubject.Id, a.SubjectId));
    }

    [Fact]
    public async Task Invalid_horizon_is_rejected()
    {
        var client = await TestClient.CreateUserClientAsync(_factory);

        var response = await client.PostJsonAsync("/api/planning/generate", new { days = 90 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
