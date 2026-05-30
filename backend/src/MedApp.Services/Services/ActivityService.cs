using MedApp.Models.Models;
using MedApp.Models.Models.Enums;
using MedApp.Services.Repositories;

namespace MedApp.Services.Services;

public class ActivityService : IActivityService
{
    private readonly IActivityRepository _repository;
    private readonly IUnitOfWork _uow;

    public ActivityService(IActivityRepository repository, IUnitOfWork uow)
    {
        _repository = repository;
        _uow = uow;
    }

    public async Task<Activity?> GetByIdAsync(Guid activityId, CancellationToken ct = default)
    {
        return await _repository.GetByIdAsync(activityId, ct);
    }

    public async Task<IEnumerable<Activity>> GetBySubjectIdAsync(Guid subjectId, CancellationToken ct = default)
    {
        return await _repository.GetBySubjectIdAsync(subjectId, ct);
    }

    public async Task<IEnumerable<Activity>> GetByStatusAsync(Status status, CancellationToken ct = default)
    {
        var activities = await _repository.GetAllAsync(ct);
        return activities.Where(a => a.Status == status);
    }

    public async Task<IEnumerable<Activity>> GetAllAsync(CancellationToken ct = default)
    {
        return await _repository.GetAllAsync(ct);
    }

    public async Task<Activity> AddAsync(Activity activity, CancellationToken ct = default)
    {
        activity.ActivityId = Guid.NewGuid();
        await _repository.AddAsync(activity, ct);
        await _uow.SaveChangesAsync(ct);
        return activity;
    }

    public async Task UpdateAsync(Activity activity, CancellationToken ct = default)
    {
        await _repository.UpdateAsync(activity, ct);
        await _uow.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(Guid activityId, CancellationToken ct = default)
    {
        await _repository.DeleteAsync(activityId, ct);
        await _uow.SaveChangesAsync(ct);
    }

    public async Task DeleteBySubjectIdAsync(Guid subjectId, CancellationToken ct = default)
    {
        var activities = await _repository.GetBySubjectIdAsync(subjectId, ct);
        foreach (var activity in activities)
        {
            await _repository.DeleteAsync(activity.ActivityId, ct);
        }
        await _uow.SaveChangesAsync(ct);
    }
}

