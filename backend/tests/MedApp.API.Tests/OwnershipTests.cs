using System.Net;
using MedApp.API.Tests.Infrastructure;

namespace MedApp.API.Tests;

// User B must not be able to see or change anything that belongs to user A.
[Collection(ApiCollection.Name)]
public class OwnershipTests
{
    private readonly ApiFactory _factory;

    public OwnershipTests(ApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Another_users_rows_are_invisible_and_untouchable()
    {
        var alice = await TestClient.CreateUserClientAsync(_factory);
        var bob = await TestClient.CreateUserClientAsync(_factory);

        var subject = await (await alice.PostJsonAsync("/api/subjects", TestClient.Subject())).ReadAsync<SubjectDto>();
        var topic = await (await alice.PostJsonAsync($"/api/subjects/{subject.Id}/topics", TestClient.Topic()))
            .ReadAsync<TopicDto>();
        var activity = await (await alice.PostJsonAsync("/api/activities", TestClient.Activity(subject.Id, topic.Id)))
            .ReadAsync<ActivityDto>();

        // Lists are scoped.
        Assert.Empty(await (await bob.GetAsync("/api/subjects")).ReadAsync<List<SubjectDto>>());
        Assert.Empty(await (await bob.GetAsync("/api/topics")).ReadAsync<List<TopicDto>>());
        Assert.Empty(await (await bob.GetAsync("/api/activities")).ReadAsync<List<ActivityDto>>());
        Assert.Empty(await (await bob.GetAsync($"/api/subjects/{subject.Id}/topics")).ReadAsync<List<TopicDto>>());

        // Reads, updates and deletes look like "not found".
        Assert.Equal(HttpStatusCode.NotFound, (await bob.GetAsync($"/api/subjects/{subject.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await bob.GetAsync($"/api/topics/{topic.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await bob.GetAsync($"/api/activities/{activity.Id}")).StatusCode);

        Assert.Equal(HttpStatusCode.NotFound,
            (await bob.PutJsonAsync($"/api/subjects/{subject.Id}", TestClient.Subject("Hijacked"))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await bob.PutJsonAsync($"/api/topics/{topic.Id}", TestClient.Topic("Hijacked"))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await bob.PutJsonAsync($"/api/activities/{activity.Id}", TestClient.Activity())).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await bob.PatchJsonAsync($"/api/activities/{activity.Id}/status", new { status = "done" })).StatusCode);

        Assert.Equal(HttpStatusCode.NotFound, (await bob.DeleteAsync($"/api/activities/{activity.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await bob.DeleteAsync($"/api/topics/{topic.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await bob.DeleteAsync($"/api/subjects/{subject.Id}")).StatusCode);

        // Bob cannot attach his own data to Alice's subject or topic.
        Assert.Equal(HttpStatusCode.NotFound,
            (await bob.PostJsonAsync($"/api/subjects/{subject.Id}/topics", TestClient.Topic())).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await bob.PostJsonAsync("/api/activities", TestClient.Activity(subject.Id))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await bob.PostJsonAsync("/api/activities", TestClient.Activity(topicId: topic.Id))).StatusCode);

        // Alice's data is unchanged.
        var aliceSubject = await (await alice.GetAsync($"/api/subjects/{subject.Id}")).ReadAsync<SubjectDto>();
        Assert.Equal("Anatomy", aliceSubject.Name);
        var aliceActivity = await (await alice.GetAsync($"/api/activities/{activity.Id}")).ReadAsync<ActivityDto>();
        Assert.Equal("scheduled", aliceActivity.Status);
    }
}
