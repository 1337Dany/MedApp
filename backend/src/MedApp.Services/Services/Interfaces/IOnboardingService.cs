using MedApp.Services.DTOs.Users;

namespace MedApp.Services.Services;

// The first-visit choice of a student: start with demo data or with an empty account.
public interface IOnboardingService
{
    // Saves the demo subjects, topics and schedule, all or nothing. Refused once the choice was made or when the
    // account already has data.
    Task<ServiceResult<UserDto>> LoadDemoDataAsync(Guid userId, string? timeZone, CancellationToken ct = default);

    Task<ServiceResult<UserDto>> CompleteAsync(Guid userId, CancellationToken ct = default);
}
