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
    public async Task Data_endpoints_require_a_token()
    {
        var client = _factory.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/subjects")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/activities")).StatusCode);
    }
}
