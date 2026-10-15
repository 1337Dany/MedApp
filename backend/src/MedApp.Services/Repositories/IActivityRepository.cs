using MedApp.Models.Models;

namespace MedApp.Services.Repositories;

public interface IActivityRepository
{
    /// <summary>Loads the activity with its recurrence (and its days) when it belongs to the user.</summary>
    Task<Activity?> GetByIdAsync(Guid id, Guid userId, CancellationToken ct = default);

    /// <summary>
    /// The user's activities that can occur in [from, to): one-off activities starting in the range and
    /// recurring series that start before <paramref name="to"/> and have not ended before <paramref name="from"/>.
    /// Null bounds are open.
    /// </summary>
    Task<IEnumerable<Activity>> GetByUserIdAsync(Guid userId, DateTime? from = null, DateTime? to = null, CancellationToken ct = default);

    /// <summary>Auto-planned sessions that are still scheduled and start at or after <paramref name="fromUtc"/>.</summary>
    Task<List<Activity>> GetReplaceableAutoPlannedAsync(Guid userId, DateTime fromUtc, CancellationToken ct = default);

    // Read-only, for aggregated analytics: activities of the users starting in [fromUtc, toUtc).
    Task<List<Activity>> GetByUserIdsAsync(IReadOnlyCollection<Guid> userIds, DateTime fromUtc, DateTime toUtc,
        CancellationToken ct = default);

    Task AddAsync(Activity activity, CancellationToken ct = default);

    Task DeleteAsync(Activity activity, CancellationToken ct = default);
}
