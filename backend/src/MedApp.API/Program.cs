using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using MedApp.API;
using MedApp.API.Controllers;
using MedApp.DAL.Context;
using MedApp.Services.Services.Auth;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddMedAppInfrastructure(builder.Configuration);

var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
    ?? throw new InvalidOperationException("Jwt configuration section is missing.");

if (string.IsNullOrWhiteSpace(jwtOptions.Key) || jwtOptions.Key.Length < 32)
{
    throw new InvalidOperationException(
        "Jwt:Key must be configured and at least 32 characters long " +
        "(e.g. via appsettings.Development.json, user-secrets or the Jwt__Key environment variable).");
}

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
        options.SaveToken = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key)),
            ClockSkew = TimeSpan.FromSeconds(jwtOptions.ClockSkewSeconds)
        };
    });

builder.Services.AddAuthorization();

// Unhandled errors leave as RFC 7807 JSON like every other error of the API, never as an empty 500.
builder.Services.AddProblemDetails();

// Enums travel as camelCase strings ("partiallyDone", "teacher") instead of numbers.
builder.Services
    .AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase)));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "MedApp API", Version = "v1" });

    const string bearerSchemeId = "Bearer";

    c.AddSecurityDefinition(bearerSchemeId, new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Description = "Enter JWT bearer token (without the 'Bearer ' prefix).",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    c.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        { new OpenApiSecuritySchemeReference(bearerSchemeId, document), new List<string>() }
    });
});

// Requests arrive through nginx, so the client IP comes from X-Forwarded-For.
// ForwardedHeaders:KnownNetworks (CIDRs) lists the networks trusted as proxies; the production compose file
// sets it to the compose network. Without it any caller is trusted, which is only safe while the API port
// is not publicly exposed (local development).
var trustedProxyNetworks = builder.Configuration.GetSection("ForwardedHeaders:KnownNetworks").Get<string[]>() ?? [];

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 1;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
    foreach (var network in trustedProxyNetworks)
    {
        options.KnownIPNetworks.Add(System.Net.IPNetwork.Parse(network));
    }
});

var authPermitLimit = builder.Configuration.GetValue("RateLimiting:AuthPermitLimit", 5);
var userPermitLimit = builder.Configuration.GetValue("RateLimiting:UserPermitLimit", 20);
var userQueueLimit = builder.Configuration.GetValue("RateLimiting:UserQueueLimit", 200);

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    // Requests of one user in progress at a time; anonymous ones are only limited by the auth policy.
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        context.User.FindFirstValue(ClaimTypes.NameIdentifier) is { } userId
            ? RateLimitPartition.GetConcurrencyLimiter(userId, _ => new ConcurrencyLimiterOptions
            {
                PermitLimit = userPermitLimit,
                QueueLimit = userQueueLimit,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst
            })
            : RateLimitPartition.GetNoLimiter("anonymous"));
    options.AddPolicy(AuthController.RateLimitPolicy, context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = authPermitLimit, Window = TimeSpan.FromMinutes(1) }));
});

var app = builder.Build();

// Off by default so a deploy never changes a production schema unless asked to (Database__MigrateOnStartup).
if (app.Configuration.GetValue<bool>("Database:MigrateOnStartup"))
{
    using var scope = app.Services.CreateScope();
    await scope.ServiceProvider.GetRequiredService<MedAppDbContext>().Database.MigrateAsync();
}

app.UseForwardedHeaders();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    // Development keeps the developer exception page.
    app.UseExceptionHandler();
}

// A write or read that waited too long for the user's history lock (Postgres lock_timeout) can simply be repeated.
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception e) when (IsLockTimeout(e) && !context.Response.HasStarted)
    {
        context.Response.Clear();
        context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
        context.Response.Headers.RetryAfter = "5";
        await context.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Title = "The server is busy with your other requests. Please try again.",
            Status = StatusCodes.Status503ServiceUnavailable
        }, options: null, contentType: "application/problem+json");
    }
});

app.UseAuthentication();
// After authentication, because the global limiter is partitioned by the signed-in user.
app.UseRateLimiter();
app.UseAuthorization();
app.MapControllers();

// Liveness for deploys and monitoring: 200 once the API runs and reaches its database.
app.MapGet("/api/health", async (MedAppDbContext db, CancellationToken ct) =>
        await db.Database.CanConnectAsync(ct)
            ? Results.Ok(new { status = "ok" })
            : Results.Problem("The database is not reachable.", statusCode: StatusCodes.Status503ServiceUnavailable))
    .AllowAnonymous()
    .ExcludeFromDescription();

app.Run();

static bool IsLockTimeout(Exception? e)
{
    for (; e is not null; e = e.InnerException)
    {
        if (e is PostgresException { SqlState: PostgresErrorCodes.LockNotAvailable })
        {
            return true;
        }
    }
    return false;
}

// Exposed for WebApplicationFactory in MedApp.API.Tests.
public partial class Program;
