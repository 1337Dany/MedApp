using MedApp.Models.Models;
using MedApp.Models.Models.Enums;
using MedApp.Services.DTOs.History;

namespace MedApp.Services.Services;

// The long-term history of what happened in the timetable (rules: docs/ANALYTICS.md).
public interface IActivityHistoryService
{
    // Occurrences that start in [fromUtc, toUtc): recorded ones before now, the current timetable after it.
    Task<IReadOnlyList<OccurrenceDto>> GetOccurrencesAsync(Guid userId, OccurrencesQuery query, CancellationToken ct = default);

    // Copies every occurrence that has started into the history (saves). Called before any change to the
    // timetable, so a change only affects the time after it.
    Task RecordPastAsync(Guid userId, CancellationToken ct = default);

    // Before the activity is changed or deleted (does not save): a one-off activity leaves the history (it is
    // recorded again with its new values), a series drops the marks of its future occurrences and, when it stops
    // being a series, keeps its past occurrences as detached history.
    Task ReleaseAsync(Activity activity, bool staysSeries, CancellationToken ct = default);

    // Sets the status of one occurrence of a series (does not save) and returns the previous one; null when the
    // series has no occurrence there.
    Task<Status?> SetOccurrenceStatusAsync(Activity series, DateTime startUtc, Status status, CancellationToken ct = default);

    // Before a subject is deleted (does not save): drops the marks of future occurrences of its series.
    Task ReleaseSubjectAsync(Guid subjectId, Guid userId, CancellationToken ct = default);
}
