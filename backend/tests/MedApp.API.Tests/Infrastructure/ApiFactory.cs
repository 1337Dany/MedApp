using System.Collections.Concurrent;
using MedApp.Services.Services.Email;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Testcontainers.PostgreSql;

namespace MedApp.API.Tests.Infrastructure;

// Runs the real API against a throwaway Postgres container; migrations are applied on start.
public sealed class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _database = new PostgreSqlBuilder("postgres:17").Build();

    public async Task InitializeAsync() => await _database.StartAsync();

    public new async Task DisposeAsync()
    {
        await base.DisposeAsync();
        await _database.DisposeAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("ConnectionStrings:Postgres", _database.GetConnectionString());
        builder.UseSetting("Database:MigrateOnStartup", "true");
        builder.UseSetting("Jwt:Key", "integration-tests-signing-key-0123456789abcdef");
        // Every test registers users; the production limit (5/min) would turn them into 429s.
        builder.UseSetting("RateLimiting:AuthPermitLimit", "10000");
        // Mails are kept in memory, so a test can follow the link of a password-reset mail.
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IEmailSender>();
            services.AddSingleton<IEmailSender>(Mails);
        });
    }

    public CapturedMails Mails { get; } = new();
}

[CollectionDefinition(Name)]
public class ApiCollection : ICollectionFixture<ApiFactory>
{
    public const string Name = "api";
}

public sealed class CapturedMails : IEmailSender
{
    private readonly ConcurrentDictionary<string, string> _lastBody = new();

    public Task SendAsync(string to, string subject, string body, CancellationToken ct = default)
    {
        _lastBody[to] = body;
        return Task.CompletedTask;
    }

    public bool AnyTo(string email) => _lastBody.ContainsKey(email);

    // The token of the reset link in the last mail to the address.
    public string ResetTokenFor(string email)
    {
        var body = _lastBody[email];
        var start = body.IndexOf("resetToken=", StringComparison.Ordinal) + "resetToken=".Length;
        var end = body.IndexOfAny(['\n', ' '], start);
        return Uri.UnescapeDataString(body[start..end]);
    }
}
