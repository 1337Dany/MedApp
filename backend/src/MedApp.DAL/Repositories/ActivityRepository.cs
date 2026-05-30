using MedApp.DAL.Context;
using MedApp.Models.Models;
using MedApp.Services.Repositories;
using Microsoft.EntityFrameworkCore;

namespace MedApp.DAL.Repositories;

public class ActivityRepository : IActivityRepository
{
    private readonly MedAppDbContext _db;

    public ActivityRepository(MedAppDbContext db)
    {
        _db = db;
    }

    public Task<Activity?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _db.Activities
            .Include(a => a.RecurringOptions)
            .Include(a => a.Subject)
            .FirstOrDefaultAsync(a => a.ActivityId == id, ct);

    public Task<IEnumerable<Activity>> GetBySubjectIdAsync(Guid subjectId, CancellationToken ct = default) =>
        _db.Activities.Where(a => a.SubjectId == subjectId).ToListAsync(ct).ContinueWith(t => (IEnumerable<Activity>)t.Result, ct);

    public Task<IEnumerable<Activity>> GetAllAsync(CancellationToken ct = default) =>
        _db.Activities.ToListAsync(ct).ContinueWith(t => (IEnumerable<Activity>)t.Result, ct);

    public Task AddAsync(Activity activity, CancellationToken ct = default)
    {
        _db.Activities.Add(activity);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(Activity activity, CancellationToken ct = default)
    {
        _db.Activities.Update(activity);
        return Task.CompletedTask;
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.Activities.FindAsync(new object[] { id }, ct);
        if (entity is not null) _db.Activities.Remove(entity);
    }
}

