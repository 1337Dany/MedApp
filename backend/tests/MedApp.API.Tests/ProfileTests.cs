using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using MedApp.API.Tests.Infrastructure;
using MedApp.DAL.Context;
using MedApp.Models.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace MedApp.API.Tests;

// PUT /api/users/me, behind the Save button of the Profile Settings modal.
[Collection(ApiCollection.Name)]
public class ProfileTests
{
    private readonly ApiFactory _factory;

    public ProfileTests(ApiFactory factory)
    {
        _factory = factory;
    }

    private static object Profile(string firstName = "Erika", string lastName = "Tester", string dateOfBirth = "1999-09-09",
        bool dataPermission = true) => new { firstName, lastName, dateOfBirth, dataPermission };

    [Fact]
    public async Task Profile_update_changes_the_own_user_only()
    {
        var client = await TestClient.CreateUserClientAsync(_factory, dataPermission: false);
        var other = await TestClient.CreateUserClientAsync(_factory, dataPermission: false);
        var before = await (await client.GetAsync("/api/auth/me")).ReadAsync<UserDto>();

        var updated = await (await client.PutJsonAsync("/api/users/me", Profile())).ReadAsync<UserDto>();

        Assert.Equal(before.Id, updated.Id);
        Assert.Equal("Erika", updated.FirstName);
        Assert.Equal("Tester", updated.LastName);
        Assert.Equal(new DateOnly(1999, 9, 9), updated.DateOfBirth);
        Assert.True(updated.DataPermission);
        // Email and role are not part of the profile.
        Assert.Equal(before.Email, updated.Email);
        Assert.Equal(before.Role, updated.Role);

        var reread = await (await client.GetAsync("/api/auth/me")).ReadAsync<UserDto>();
        Assert.Equal("Erika", reread.FirstName);
        var untouched = await (await other.GetAsync("/api/auth/me")).ReadAsync<UserDto>();
        Assert.Equal("Test", untouched.FirstName);
        Assert.False(untouched.DataPermission);
    }

    [Fact]
    public async Task Invalid_profiles_are_rejected_with_field_errors()
    {
        var client = await TestClient.CreateUserClientAsync(_factory);
        var future = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(2)).ToString("yyyy-MM-dd");

        var cases = new (object Body, string Field)[]
        {
            (Profile(firstName: ""), "FirstName"),
            (Profile(lastName: new string('x', 51)), "LastName"),
            (Profile(dateOfBirth: future), "DateOfBirth"),
            (Profile(dateOfBirth: "1899-12-31"), "DateOfBirth"),
        };

        foreach (var (body, field) in cases)
        {
            var response = await client.PutJsonAsync("/api/users/me", body);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Contains(field, await response.Content.ReadAsStringAsync());
        }

        var unchanged = await (await client.GetAsync("/api/auth/me")).ReadAsync<UserDto>();
        Assert.Equal("Test", unchanged.FirstName);
    }

    [Fact]
    public async Task Profile_update_requires_a_token()
    {
        var anonymous = _factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PutJsonAsync("/api/users/me", Profile())).StatusCode);
    }

    [Fact]
    public async Task Deleting_the_own_account_needs_the_password_and_removes_everything()
    {
        var client = _factory.CreateClient();
        var email = $"leave-{Guid.NewGuid():N}@example.com";
        var tokens = await TestClient.RegisterAsync(client, email);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokens.AccessToken);
        var other = await TestClient.CreateUserClientAsync(_factory);
        await other.PostJsonAsync("/api/subjects", TestClient.Subject("Stays"));

        var subject = await (await client.PostJsonAsync("/api/subjects", TestClient.Subject())).ReadAsync<SubjectDto>();
        await client.PostJsonAsync($"/api/subjects/{subject.Id}/topics", TestClient.Topic());
        var weekly = new { frequency = "weekly", daysOfWeek = new[] { "monday" } };
        await client.PostJsonAsync("/api/activities", TestClient.Activity(subject.Id, recurrence: weekly));
        // Reading the occurrences records the started ones into the history.
        (await client.GetAsync("/api/occurrences?from=2026-11-01T00:00:00Z&to=2026-11-10T00:00:00Z")).EnsureSuccessStatusCode();

        var wrong = await DeleteMeAsync(client, TestClient.Password + "x");
        Assert.Equal(HttpStatusCode.BadRequest, wrong.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me")).StatusCode);

        Assert.Equal(HttpStatusCode.NoContent, (await DeleteMeAsync(client, TestClient.Password)).StatusCode);

        // The account is gone: no profile, no sign-in, no refresh; the address is free again.
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await client.PostJsonAsync("/api/auth/login", new { email, password = TestClient.Password })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await client.PostJsonAsync("/api/auth/refresh", new { refreshToken = tokens.RefreshToken })).StatusCode);
        await TestClient.RegisterAsync(_factory.CreateClient(), email);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<MedAppDbContext>();
        Assert.False(await db.Subjects.AnyAsync(s => s.SubjectId == subject.Id));
        Assert.False(await db.Topics.AnyAsync(t => t.SubjectId == subject.Id));
        Assert.False(await db.RecurringOptions.AnyAsync(ro => !ro.Activities.Any()));
        // Other users keep their data.
        Assert.Single(await (await other.GetAsync("/api/subjects")).ReadAsync<List<SubjectDto>>());
    }

    [Fact]
    public async Task The_only_admin_cannot_delete_their_account()
    {
        // Own database: the rule depends on how many admins exist.
        await using var factory = new ApiFactory();
        await factory.InitializeAsync();
        var (admin, _) = await Roles.CreateUserWithRoleAsync(factory, UserRole.Admin);

        Assert.Equal(HttpStatusCode.BadRequest, (await DeleteMeAsync(admin, TestClient.Password)).StatusCode);

        await Roles.CreateUserWithRoleAsync(factory, UserRole.Admin);
        Assert.Equal(HttpStatusCode.NoContent, (await DeleteMeAsync(admin, TestClient.Password)).StatusCode);
    }

    private static Task<HttpResponseMessage> DeleteMeAsync(HttpClient client, string password) =>
        client.SendAsync(new HttpRequestMessage(HttpMethod.Delete, "/api/users/me")
        {
            Content = JsonContent.Create(new { password }, options: TestClient.Json)
        });
}
