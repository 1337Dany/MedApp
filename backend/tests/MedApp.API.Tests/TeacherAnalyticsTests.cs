using System.Net;
using MedApp.API.Tests.Infrastructure;
using MedApp.Models.Models.Enums;

namespace MedApp.API.Tests;

// Own database (class fixture): the counts below depend on exactly which students exist.
public class TeacherAnalyticsTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public TeacherAnalyticsTests(ApiFactory factory)
    {
        _factory = factory;
    }

    private record AnalyticsDto(bool InsufficientData, int MinimumGroupSize, int TotalStudents, int AverageCompletionRate,
        int StudentsAtRisk, int ActiveSubjects, List<SubjectPerformance> SubjectPerformance);

    private record SubjectPerformance(string Subject, int Students, int AvgKnowledge, int StudentsStruggling);

    private async Task<HttpClient> StudentAsync(bool consent, string subject, string feedback)
    {
        var client = await TestClient.CreateUserClientAsync(_factory, consent);
        var created = await (await client.PostJsonAsync("/api/subjects", TestClient.Subject(subject))).ReadAsync<SubjectDto>();
        await client.PostJsonAsync($"/api/subjects/{created.Id}/topics", TestClient.Topic("Topic", feedback));
        return client;
    }

    [Fact]
    public async Task Analytics_need_consent_a_minimum_group_and_a_staff_role()
    {
        var (teacher, _) = await Roles.CreateUserWithRoleAsync(_factory, UserRole.Teacher);
        var student = await StudentAsync(true, "Anatomy", "green");

        Assert.Equal(HttpStatusCode.Forbidden, (await student.GetAsync("/api/teacher/analytics")).StatusCode);

        // One consenting student is below the minimum group size.
        var early = await (await teacher.GetAsync("/api/teacher/analytics")).ReadAsync<AnalyticsDto>();
        Assert.True(early.InsufficientData);
        Assert.Equal(0, early.TotalStudents);

        for (var i = 0; i < 4; i++)
        {
            await StudentAsync(true, "Anatomy", i == 0 ? "green" : "red");
        }
        // Students without consent are never counted, whatever they do.
        for (var i = 0; i < 3; i++)
        {
            await StudentAsync(false, "Anatomy", "green");
        }
        await StudentAsync(true, "Elective", "red"); // 6th consenting student, alone in their subject

        var result = await (await teacher.GetAsync("/api/teacher/analytics")).ReadAsync<AnalyticsDto>();

        Assert.False(result.InsufficientData);
        Assert.Equal(6, result.TotalStudents);
        var anatomy = Assert.Single(result.SubjectPerformance); // "Elective" has one student: suppressed
        Assert.Equal(5, anatomy.Students);
        Assert.Equal(40, anatomy.AvgKnowledge);       // 2 green, 3 red
        Assert.Equal(3, anatomy.StudentsStruggling);

        // Withdrawing consent removes the student immediately.
        var withdrawn = await student.PutJsonAsync("/api/users/me", new
        {
            firstName = "Test",
            lastName = "User",
            dateOfBirth = "2000-01-01",
            dataPermission = false
        });
        Assert.False((await withdrawn.ReadAsync<UserDto>()).DataPermission);

        var after = await (await teacher.GetAsync("/api/teacher/analytics")).ReadAsync<AnalyticsDto>();
        Assert.Equal(5, after.TotalStudents);
        Assert.Empty(after.SubjectPerformance); // Anatomy is down to 4 students
    }

    [Fact]
    public async Task Only_admins_manage_roles()
    {
        var (admin, adminId) = await Roles.CreateUserWithRoleAsync(_factory, UserRole.Admin);
        var student = await TestClient.CreateUserClientAsync(_factory);
        var studentMe = await (await student.GetAsync("/api/auth/me")).ReadAsync<UserDto>();

        Assert.Equal(HttpStatusCode.Forbidden, (await student.GetAsync("/api/users")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await student.PutJsonAsync($"/api/users/{studentMe.Id}/role", new { role = "admin" })).StatusCode);

        var users = await (await admin.GetAsync("/api/users")).ReadAsync<List<UserDto>>();
        Assert.Contains(users, u => u.Id == studentMe.Id);

        var promoted = await (await admin.PutJsonAsync($"/api/users/{studentMe.Id}/role", new { role = "teacher" }))
            .ReadAsync<UserDto>();
        Assert.Equal("teacher", promoted.Role);

        Assert.Equal(HttpStatusCode.BadRequest,
            (await admin.PutJsonAsync($"/api/users/{adminId}/role", new { role = "user" })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await admin.PutJsonAsync($"/api/users/{Guid.NewGuid()}/role", new { role = "teacher" })).StatusCode);
    }
}
