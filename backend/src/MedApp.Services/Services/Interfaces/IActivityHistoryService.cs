using MedApp.Models.Models;
using MedApp.Models.Models.Enums;
using MedApp.Services.DTOs.History;
using MedApp.Services.Repositories;

namespace MedApp.Services.Services;

// The long-term history of what happened in the timetable (rules: docs/ANALYTICS.md).
public interface IActivityHistoryService
{
    // Occurrences that start in [fromUtc, toUtc): recorded ones before now, the current timetable after it.
    Task<IReadOnlyList<OccurrenceDto>> GetOccurrencesAsync(Guid userId, OccurrencesQuery query, CancellationToken ct = default);

    // Opens a transaction that holds the user's history lock. A write to the timetable runs entirely inside it, or a
    // parallel read could record an activity the write is changing or deleting. Disposing it uncommitted rolls back.
    Task<IUnitOfWorkTransaction> BeginWriteAsync(Guid userId, CancellationToken ct = default);

    // Copies every occurrence that has started into the history (saves). Called before any change to the
    // timetable, so a change only affects the time after it.
    Task RecordPastAsync(Guid userId, CancellationToken ct = default);

    // Before the activity is changed or deleted (does not save): a one-off activity leaves the history (it is
    // recorded again with its new values), a series drops the marks of its future occurrences and, when it stops
    // being a series, keeps its past occurrences as detached history. When it turns from one into the other, the
    // past entry in the same minute as newStartUtc stays linked as the occurrence at the new start: a one-off's status
    // becomes the mark of that occurrence. Returns the mark a series had on the occurrence at newStartUtc, if any.
    Task<Status?> ReleaseAsync(Activity activity, bool staysSeries, DateTime? newStartUtc = null, CancellationToken ct = default);

    // After a series got a new pattern (does not save): records its occurrence today that has already passed, unless
    // the series has a row for today, because neither the recording (from its last run) nor the live part (from now)
    // would cover it.
    Task RecordTodayOfMovedSeriesAsync(Activity series, CancellationToken ct = default);

    // Sets the status of one occurrence of a series (does not save) and returns the previous one; null when the
    // series has no occurrence there.
    Task<Status?> SetOccurrenceStatusAsync(Activity series, DateTime startUtc, Status status, CancellationToken ct = default);

    // Before a subject is deleted (does not save): drops the marks of future occurrences of its series.
    Task ReleaseSubjectAsync(Guid subjectId, Guid userId, CancellationToken ct = default);
}
