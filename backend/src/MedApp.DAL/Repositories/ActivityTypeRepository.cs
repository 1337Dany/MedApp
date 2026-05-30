using MedApp.DAL.Context;
using MedApp.Models.Models;
using MedApp.Services.Repositories;
using Microsoft.EntityFrameworkCore;

namespace MedApp.DAL.Repositories;

public class ActivityTypeRepository : IActivityTypeRepository
{
    private readonly MedAppDbContext _db;

    public ActivityTypeRepository(MedAppDbContext db)
    {
        _db = db;
    }

    public Task<ActivityType?> GetByIdAsync(int id, CancellationToken ct = default) =>
        _db.ActivityTypes.FirstOrDefaultAsync(t => t.TypeId == id, ct);

    public Task<IEnumerable<ActivityType>> GetAllAsync(CancellationToken ct = default) =>
        _db.ActivityTypes.ToListAsync(ct).ContinueWith(t => (IEnumerable<ActivityType>)t.Result, ct);

    public Task AddAsync(ActivityType type, CancellationToken ct = default)
    {
        _db.ActivityTypes.Add(type);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(ActivityType type, CancellationToken ct = default)
    {
        _db.ActivityTypes.Update(type);
        return Task.CompletedTask;
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var entity = await _db.ActivityTypes.FindAsync(new object[] { id }, ct);
        if (entity is not null) _db.ActivityTypes.Remove(entity);
    }
}

