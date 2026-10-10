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
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;

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

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
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

app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

// Exposed for WebApplicationFactory in MedApp.API.Tests.
public partial class Program;
