using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace MedApp.API.Tests.Infrastructure;

// Thin helpers over HttpClient that speak the API's JSON conventions.
public static class TestClient
{
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    // Generated per test run so no credential is committed; it satisfies the registration password rules.
    public static readonly string Password = $"Aa1!{Guid.NewGuid():N}";

    public record Tokens(string AccessToken, string RefreshToken);

    public static async Task<Tokens> RegisterAsync(HttpClient client, string? email = null, bool dataPermission = true)
    {
        var response = await client.PostAsJsonAsync("/api/auth/register", new
        {
            firstName = "Test",
            lastName = "User",
            dateOfBirth = "2000-01-01",
            email = email ?? $"user-{Guid.NewGuid():N}@example.com",
            password = Password,
            dataPermission
        }, Json);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<Tokens>(Json))!;
    }

    public static async Task<Tokens> LoginAsync(HttpClient client, string email) =>
        await (await client.PostJsonAsync("/api/auth/login", new { email, password = Password })).ReadAsync<Tokens>();

    public static async Task<HttpClient> CreateUserClientAsync(ApiFactory factory, bool dataPermission = true)
    {
        var client = factory.CreateClient();
        var tokens = await RegisterAsync(client, dataPermission: dataPermission);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokens.AccessToken);
        return client;
    }

    public static async Task<T> ReadAsync<T>(this HttpResponseMessage response)
    {
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<T>(Json))!;
    }

    public static Task<HttpResponseMessage> PostJsonAsync(this HttpClient client, string url, object body) =>
        client.PostAsJsonAsync(url, body, Json);

    public static Task<HttpResponseMessage> PutJsonAsync(this HttpClient client, string url, object body) =>
        client.PutAsJsonAsync(url, body, Json);

    public static Task<HttpResponseMessage> PatchJsonAsync(this HttpClient client, string url, object body) =>
        client.PatchAsJsonAsync(url, body, Json);

    public static object Subject(string name = "Anatomy", int planningMethodId = 1, string? examDate = "2099-01-20",
        string studyMode = "relaxed") => new
        {
            name,
            examDate,
            planningMethodId,
            priority = 5,
            studyMode,
            colorHex = "#3b82f6"
        };

    public static object Topic(string title = "Heart", string feedback = "red") => new { title, feedback };

    public static object Activity(Guid? subjectId = null, Guid? topicId = null, object? recurrence = null,
        string startTime = "2026-11-02T10:00:00Z", int activityTypeId = 1) => new
        {
            subjectId,
            topicId,
            title = "Session",
            activityTypeId,
            priority = 3,
            startTime,
            durationMinutes = 60,
            isRecurring = recurrence is not null,
            recurrence,
            isNegotiable = true,
            status = "scheduled"
        };
}

public record SubjectDto(Guid Id, string Name, DateOnly? ExamDate, int PlanningMethodId, int Priority, string StudyMode, string ColorHex);

public record TopicDto(Guid Id, Guid SubjectId, string Title, string? Notes, string Feedback, int Order,
    DateTime? LastStudied, DateTime? NextReview);

public record RecurrenceDto(string Frequency, List<string> DaysOfWeek, DateOnly? Until);

public record ActivityDto(Guid Id, Guid? SubjectId, Guid? TopicId, string Title, int ActivityTypeId, int Priority,
    DateTime StartTime, int DurationMinutes, bool IsRecurring, RecurrenceDto? Recurrence, bool IsNegotiable,
    string? Notes, string Status, bool IsAutoPlanned);

public record PlanningWarningDto(DateOnly Date, string Severity, string Message, List<string> Suggestions);

public record PlanResultDto(List<ActivityDto> Sessions, List<PlanningWarningDto> Warnings);
