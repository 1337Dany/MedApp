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

    public Task<int> DeleteByActivityIdAsync(Guid activityId, CancellationToken ct = default) =>
        _db.ActivityOccurrences
            .Where(o => o.ActivityId == activityId)
            .ExecuteDeleteAsync(ct);

    public Task<int> DeleteOfSubjectAsync(Guid subjectId, Guid userId, CancellationToken ct = default) =>
        _db.ActivityOccurrences
            .Where(o => o.UserId == userId &&
                        (o.ActivityId == null ? o.SubjectId == subjectId : o.Activity!.SubjectId == subjectId))
            .ExecuteDeleteAsync(ct);

    public Task<ActivityOccurrence?> GetDetachedAsync(Guid occurrenceId, Guid userId, CancellationToken ct = default) =>
        _db.ActivityOccurrences
            .FirstOrDefaultAsync(o => o.ActivityOccurrenceId == occurrenceId && o.UserId == userId && o.ActivityId == null, ct);

    // A transaction-scoped Postgres advisory lock keyed by the user id. Waiting holds a pooled connection, so the wait
    // is limited: past the timeout Postgres raises 55P03, which the API answers with 503.
    public async Task LockUserHistoryAsync(Guid userId, CancellationToken ct = default)
    {
        var bytes = userId.ToByteArray();
        var key = BitConverter.ToInt64(bytes, 0) ^ BitConverter.ToInt64(bytes, 8);
        // One round trip: the timeout and the lock travel in the same batch.
        await _db.Database.ExecuteSqlInterpolatedAsync(
            $"SET LOCAL lock_timeout = '5s'; SELECT pg_advisory_xact_lock({key})", ct);
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
