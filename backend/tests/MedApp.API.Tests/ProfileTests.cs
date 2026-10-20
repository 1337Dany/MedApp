using System.Net;
using MedApp.API.Tests.Infrastructure;

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
}
