using MedApp.DAL.Context;
using MedApp.Models.Models;
using MedApp.Services.Repositories;
using Microsoft.EntityFrameworkCore;

namespace MedApp.DAL.Repositories;

public class ActivityOccurrenceRepository : IActivityOccurrenceRepository
{
    private readonly MedAppDbContext _db;

    public ActivityOccurrenceRepository(MedAppDbContext db)
    {
        _db = db;
    }

    public Task<List<ActivityOccurrence>> GetByUserIdAsync(Guid userId, DateTime fromUtc, DateTime toUtc,
        CancellationToken ct = default) =>
        _db.ActivityOccurrences
            .Where(o => o.UserId == userId && o.StartTime >= fromUtc && o.StartTime < toUtc)
            .OrderBy(o => o.StartTime)
            .ToListAsync(ct);

    public Task<List<ActivityOccurrence>> GetByActivityIdsAsync(IReadOnlyCollection<Guid> activityIds, DateTime? fromUtc = null,
        CancellationToken ct = default)
    {
        var query = _db.ActivityOccurrences
            .Where(o => o.ActivityId != null && activityIds.Contains(o.ActivityId.Value));

        if (fromUtc is not null)
        {
            query = query.Where(o => o.StartTime >= fromUtc);
        }

        return query.ToListAsync(ct);
    }

    // A transaction-scoped Postgres advisory lock keyed by the user id.
    public Task LockUserHistoryAsync(Guid userId, CancellationToken ct = default)
    {
        var key = BitConverter.ToInt64(userId.ToByteArray(), 0) ^ BitConverter.ToInt64(userId.ToByteArray(), 8);
        return _db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock({key})", ct);
    }

    public Task AddAsync(ActivityOccurrence occurrence, CancellationToken ct = default)
    {
        _db.ActivityOccurrences.Add(occurrence);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(ActivityOccurrence occurrence, CancellationToken ct = default)
    {
        _db.ActivityOccurrences.Remove(occurrence);
        return Task.CompletedTask;
    }
}
