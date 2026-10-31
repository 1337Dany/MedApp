using MedApp.Models.Models;

namespace MedApp.Services.Repositories;

public interface IActivityOccurrenceRepository
{
    /// <summary>The user's history rows that start in [fromUtc, toUtc), ordered by start.</summary>
    Task<List<ActivityOccurrence>> GetByUserIdAsync(Guid userId, DateTime fromUtc, DateTime toUtc, CancellationToken ct = default);

    /// <summary>History rows of the activities, from <paramref name="fromUtc"/> on when it is set.</summary>
    Task<List<ActivityOccurrence>> GetByActivityIdsAsync(IReadOnlyCollection<Guid> activityIds, DateTime? fromUtc = null,
        CancellationToken ct = default);

    /// <summary>
    /// Waits until no other transaction records the user's history or changes their activities, and holds that
    /// until the current transaction ends. Requires an open transaction; taking it again inside one is fine.
    /// The wait is limited; past it the database call fails with a lock timeout.
    /// </summary>
    Task LockUserHistoryAsync(Guid userId, CancellationToken ct = default);

    Task AddAsync(ActivityOccurrence occurrence, CancellationToken ct = default);

    Task DeleteAsync(ActivityOccurrence occurrence, CancellationToken ct = default);
}
