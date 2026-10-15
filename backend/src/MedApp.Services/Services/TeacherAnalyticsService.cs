using MedApp.Services.Analytics;
using MedApp.Services.DTOs.Analytics;
using MedApp.Services.Repositories;

namespace MedApp.Services.Services;

// Collects the data of consenting students only and hands it to the anonymous calculator.
public class TeacherAnalyticsService : ITeacherAnalyticsService
{
    private readonly IUserRepository _users;
    private readonly ISubjectRepository _subjects;
    private readonly IActivityRepository _activities;

    public TeacherAnalyticsService(IUserRepository users, ISubjectRepository subjects, IActivityRepository activities)
    {
        _users = users;
        _subjects = subjects;
        _activities = activities;
    }

    public async Task<ClassAnalyticsDto> GetClassAnalyticsAsync(CancellationToken ct = default)
    {
        var nowUtc = DateTime.UtcNow;
        var studentIds = await _users.GetConsentingStudentIdsAsync(ct);
        if (studentIds.Count < ClassAnalyticsCalculator.MinimumGroupSize)
        {
            return ClassAnalyticsCalculator.Calculate(Array.Empty<StudentData>(), nowUtc);
        }

        var subjects = (await _subjects.GetByUserIdsAsync(studentIds, ct)).ToLookup(s => s.UserId);
        var activities = (await _activities.GetByUserIdsAsync(studentIds,
            nowUtc.AddDays(-7 * (ClassAnalyticsCalculator.Weeks + 1)), nowUtc, ct)).ToLookup(a => a.UserId);

        var students = studentIds
            .Select(id => new StudentData(
                subjects[id].Select(s => new StudentSubject(s.Name, s.Topics.Select(t => t.Feedback).ToList())).ToList(),
                activities[id].Select(a => new StudentActivity(a.StartTime, a.DurationMinutes, a.ActivityTypeId, a.Status)).ToList()))
            .ToList();

        return ClassAnalyticsCalculator.Calculate(students, nowUtc);
    }
}
