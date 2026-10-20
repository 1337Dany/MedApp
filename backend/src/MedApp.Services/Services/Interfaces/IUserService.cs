using MedApp.Models.Models.Enums;
using MedApp.Services.DTOs.Users;

namespace MedApp.Services.Services;

public interface IUserService
{
    // The caller's own profile and data-sharing consent. Null if the user does not exist.
    Task<UserDto?> UpdateProfileAsync(Guid userId, UpdateProfileRequest request, CancellationToken ct = default);

    // Admin only (enforced by the controller).
    Task<IEnumerable<UserDto>> GetAllAsync(CancellationToken ct = default);

    // Admin only (enforced by the controller). An admin cannot change their own role (no lock-out).
    Task<ServiceResult<UserDto>> SetRoleAsync(Guid targetUserId, Guid callerId, UserRole role, CancellationToken ct = default);
}
