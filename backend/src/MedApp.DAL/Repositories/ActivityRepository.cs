using MedApp.DAL.Context;
using MedApp.Models.Models;
using MedApp.Models.Models.Enums;
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

    public Task<Activity?> GetByIdAsync(Guid id, Guid userId, CancellationToken ct = default) =>
        _db.Activities
            .Include(a => a.RecurringOptions)
            .ThenInclude(ro => ro!.DaysOfWeek)
            .FirstOrDefaultAsync(a => a.ActivityId == id && a.UserId == userId, ct);

    public async Task<IEnumerable<Activity>> GetByUserIdAsync(Guid userId, DateTime? from = null, DateTime? to = null,
        CancellationToken ct = default)
    {
        var query = _db.Activities
            .Include(a => a.RecurringOptions)
            .ThenInclude(ro => ro!.DaysOfWeek)
            .Where(a => a.UserId == userId);

        if (to is not null)
        {
            query = query.Where(a => a.StartTime < to);
        }

        if (from is not null)
        {
            var fromDate = DateOnly.FromDateTime(from.Value);
            query = query.Where(a =>
                a.StartTime >= from ||
                (a.IsRecurring && (a.RecurringOptions!.Until == null || a.RecurringOptions.Until >= fromDate)));
        }

        return await query.OrderBy(a => a.StartTime).ToListAsync(ct);
    }

    public Task<List<Activity>> GetReplaceableAutoPlannedAsync(Guid userId, DateTime fromUtc, CancellationToken ct = default) =>
        _db.Activities
            .Where(a => a.UserId == userId && a.IsAutoPlanned && a.Status == Status.Scheduled && a.StartTime >= fromUtc)
            .ToListAsync(ct);

    public Task<List<Activity>> GetByUserIdsAsync(IReadOnlyCollection<Guid> userIds, DateTime fromUtc, DateTime toUtc,
        CancellationToken ct = default) =>
        _db.Activities
            .AsNoTracking()
            .Where(a => userIds.Contains(a.UserId) && a.StartTime >= fromUtc && a.StartTime < toUtc)
            .ToListAsync(ct);

    public Task AddAsync(Activity activity, CancellationToken ct = default)
    {
        _db.Activities.Add(activity);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(Activity activity, CancellationToken ct = default)
    {
        _db.Activities.Remove(activity);
        return Task.CompletedTask;
    }
}
