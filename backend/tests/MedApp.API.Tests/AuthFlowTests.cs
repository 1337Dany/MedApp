using System.Net;
using System.Net.Http.Headers;
using MedApp.API.Tests.Infrastructure;

namespace MedApp.API.Tests;

[Collection(ApiCollection.Name)]
public class AuthFlowTests
{
    private readonly ApiFactory _factory;

    public AuthFlowTests(ApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Register_login_refresh_and_replay_detection()
    {
        var client = _factory.CreateClient();
        var email = $"flow-{Guid.NewGuid():N}@example.com";
        await TestClient.RegisterAsync(client, email);

        var login = await TestClient.LoginAsync(client, email);

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", login.AccessToken);
        var me = await client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);
        Assert.Contains("\"role\":\"user\"", await me.Content.ReadAsStringAsync());

        var rotated = await (await client.PostJsonAsync("/api/auth/refresh", new { refreshToken = login.RefreshToken }))
            .ReadAsync<TestClient.Tokens>();
        Assert.NotEqual(login.RefreshToken, rotated.RefreshToken);

        // Replaying the old token fails and revokes the whole chain, including the rotated token.
        var replay = await client.PostJsonAsync("/api/auth/refresh", new { refreshToken = login.RefreshToken });
        Assert.Equal(HttpStatusCode.Unauthorized, replay.StatusCode);

        var afterReplay = await client.PostJsonAsync("/api/auth/refresh", new { refreshToken = rotated.RefreshToken });
        Assert.Equal(HttpStatusCode.Unauthorized, afterReplay.StatusCode);
    }

    [Fact]
    public async Task Wrong_password_is_rejected()
    {
        var client = _factory.CreateClient();
        var email = $"wrong-{Guid.NewGuid():N}@example.com";
        await TestClient.RegisterAsync(client, email);

        var response = await client.PostJsonAsync("/api/auth/login", new { email, password = TestClient.Password + "x" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Logout_revokes_the_refresh_token()
    {
        var client = _factory.CreateClient();
        var tokens = await TestClient.RegisterAsync(client);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokens.AccessToken);

        var logout = await client.PostJsonAsync("/api/auth/logout", new { refreshToken = tokens.RefreshToken });
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);

        var refresh = await client.PostJsonAsync("/api/auth/refresh", new { refreshToken = tokens.RefreshToken });
        Assert.Equal(HttpStatusCode.Unauthorized, refresh.StatusCode);
    }

    [Fact]
    public async Task Changing_the_password_ends_other_sessions_and_keeps_this_one()
    {
        var client = _factory.CreateClient();
        var email = $"password-{Guid.NewGuid():N}@example.com";
        var other = await TestClient.RegisterAsync(client, email);
        var current = await TestClient.LoginAsync(client, email);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", current.AccessToken);
        var newPassword = TestClient.Password + "N1";

        var wrong = await client.PostJsonAsync("/api/auth/change-password",
            new { currentPassword = TestClient.Password + "x", newPassword });
        Assert.Equal(HttpStatusCode.BadRequest, wrong.StatusCode);

        var weak = await client.PostJsonAsync("/api/auth/change-password",
            new { currentPassword = TestClient.Password, newPassword = "short" });
        Assert.Equal(HttpStatusCode.BadRequest, weak.StatusCode);

        var changed = await (await client.PostJsonAsync("/api/auth/change-password",
            new { currentPassword = TestClient.Password, newPassword })).ReadAsync<TestClient.Tokens>();

        // Refresh tokens issued before the change are dead, the one from the answer works.
        foreach (var old in new[] { other.RefreshToken, current.RefreshToken })
        {
            var refresh = await client.PostJsonAsync("/api/auth/refresh", new { refreshToken = old });
            Assert.Equal(HttpStatusCode.Unauthorized, refresh.StatusCode);
        }
        // (The replays above revoke the user's whole chain, so the new token is checked through a new sign-in.)
        Assert.False(string.IsNullOrEmpty(changed.RefreshToken));

        var oldLogin = await client.PostJsonAsync("/api/auth/login", new { email, password = TestClient.Password });
        Assert.Equal(HttpStatusCode.Unauthorized, oldLogin.StatusCode);
        var newLogin = await client.PostJsonAsync("/api/auth/login", new { email, password = newPassword });
        Assert.Equal(HttpStatusCode.OK, newLogin.StatusCode);
    }

    [Fact]
    public async Task A_forgotten_password_is_reset_once_with_the_mailed_link()
    {
        var client = _factory.CreateClient();
        var email = $"forgot-{Guid.NewGuid():N}@example.com";
        var session = await TestClient.RegisterAsync(client, email);
        var unknown = $"nobody-{Guid.NewGuid():N}@example.com";
        var newPassword = TestClient.Password + "R1";

        // The answer is the same whether or not the address has an account; only the real one gets a mail.
        Assert.Equal(HttpStatusCode.NoContent,
            (await client.PostJsonAsync("/api/auth/forgot-password", new { email = unknown })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent,
            (await client.PostJsonAsync("/api/auth/forgot-password", new { email })).StatusCode);
        Assert.False(_factory.Mails.AnyTo(unknown));
        var token = _factory.Mails.ResetTokenFor(email);

        Assert.Equal(HttpStatusCode.BadRequest,
            (await client.PostJsonAsync("/api/auth/reset-password", new { token = token + "x", newPassword })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,
            (await client.PostJsonAsync("/api/auth/reset-password", new { token, newPassword = "weak" })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent,
            (await client.PostJsonAsync("/api/auth/reset-password", new { token, newPassword })).StatusCode);

        // The link works once, the old password and the old sessions are gone, the new password signs in.
        Assert.Equal(HttpStatusCode.BadRequest,
            (await client.PostJsonAsync("/api/auth/reset-password", new { token, newPassword })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await client.PostJsonAsync("/api/auth/refresh", new { refreshToken = session.RefreshToken })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await client.PostJsonAsync("/api/auth/login", new { email, password = TestClient.Password })).StatusCode);
        Assert.Equal(HttpStatusCode.OK,
            (await client.PostJsonAsync("/api/auth/login", new { email, password = newPassword })).StatusCode);
    }

    [Fact]
    public async Task Registering_the_same_email_at_the_same_moment_creates_one_account()
    {
        var email = $"race-{Guid.NewGuid():N}@example.com";
        var body = new
        {
            firstName = "Test",
            lastName = "User",
            dateOfBirth = "2000-01-01",
            email,
            password = TestClient.Password,
            dataPermission = false
        };

        var responses = await Task.WhenAll(Enumerable.Range(0, 8)
            .Select(_ => _factory.CreateClient().PostJsonAsync("/api/auth/register", body)));

        Assert.Single(responses, r => r.StatusCode == HttpStatusCode.OK);
        Assert.All(responses.Where(r => r.StatusCode != HttpStatusCode.OK),
            r => Assert.Equal(HttpStatusCode.Conflict, r.StatusCode));
    }

    [Fact]
    public async Task Health_is_public_and_checks_the_database()
    {
        var response = await _factory.CreateClient().GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Data_endpoints_require_a_token()
    {
        var client = _factory.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/subjects")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/activities")).StatusCode);
    }
}
