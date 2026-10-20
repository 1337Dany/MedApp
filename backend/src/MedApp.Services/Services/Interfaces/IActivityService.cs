using MedApp.Models.Models.Enums;
using MedApp.Services.DTOs.Activities;

namespace MedApp.Services.Services;

// Every method is scoped to the caller (userId from the token). Null / false means "not found or not yours".
public interface IActivityService
{
    Task<IEnumerable<ActivityDto>> GetAllAsync(Guid userId, DateTime? from = null, DateTime? to = null, CancellationToken ct = default);
    Task<ActivityDto?> GetByIdAsync(Guid activityId, Guid userId, CancellationToken ct = default);
    Task<ServiceResult<ActivityDto>> CreateAsync(Guid userId, ActivityRequest request, CancellationToken ct = default);
    Task<ServiceResult<ActivityDto>> UpdateAsync(Guid activityId, Guid userId, ActivityRequest request, CancellationToken ct = default);
    Task<ActivityDto?> UpdateStatusAsync(Guid activityId, Guid userId, Status status, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid activityId, Guid userId, CancellationToken ct = default);
}
