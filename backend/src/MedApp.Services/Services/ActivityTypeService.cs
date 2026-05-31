using MedApp.Models.Models;
using MedApp.Services.Repositories;

namespace MedApp.Services.Services;

public class ActivityTypeService : IActivityTypeService
{
    private readonly IActivityTypeRepository _repository;
    private readonly IUnitOfWork _uow;

    public ActivityTypeService(IActivityTypeRepository repository, IUnitOfWork uow)
    {
        _repository = repository;
        _uow = uow;
    }

    public async Task<ActivityType?> GetByIdAsync(int typeId, CancellationToken ct = default)
    {
        return await _repository.GetByIdAsync(typeId, ct);
    }

    public async Task<IEnumerable<ActivityType>> GetAllAsync(CancellationToken ct = default)
    {
        return await _repository.GetAllAsync(ct);
    }

    public async Task<ActivityType> AddAsync(ActivityType activityType, CancellationToken ct = default)
    {
        await _repository.AddAsync(activityType, ct);
        await _uow.SaveChangesAsync(ct);
        return activityType;
    }

    public async Task UpdateAsync(ActivityType activityType, CancellationToken ct = default)
    {
        await _repository.UpdateAsync(activityType, ct);
        await _uow.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(int typeId, CancellationToken ct = default)
    {
        await _repository.DeleteAsync(typeId, ct);
        await _uow.SaveChangesAsync(ct);
    }
}

