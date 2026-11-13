using AutoMapper;
using MedApp.Models.Models;
using MedApp.Models.Models.Enums;
using MedApp.Services.DTOs.History;
using MedApp.Services.History;
using MedApp.Services.Planning;
using MedApp.Services.Repositories;

namespace MedApp.Services.Services;

public class ActivityHistoryService : IActivityHistoryService
{
    private readonly IActivityRepository _activities;
    private readonly IActivityOccurrenceRepository _occurrences;
    private readonly IUserRepository _users;
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;

    public ActivityHistoryService(
        IActivityRepository activities,
        IActivityOccurrenceRepository occurrences,
        IUserRepository users,
        IUnitOfWork uow,
        IMapper mapper)
    {
        _activities = activities;
        _occurrences = occurrences;
        _users = users;
        _uow = uow;
        _mapper = mapper;
    }

    public async Task<IReadOnlyList<OccurrenceDto>> GetOccurrencesAsync(Guid userId, OccurrencesQuery query,
        CancellationToken ct = default)
    {
        var fromUtc = ToUtc(query.From);
        var toUtc = ToUtc(query.To);
        var nowUtc = DateTime.UtcNow;
        var zone = await FindZoneAsync(userId, query.TimeZone, ct);

        await RecordPastAsync(userId, nowUtc, zone, ct);

        var rows = await _occurrences.GetByUserIdAsync(userId, fromUtc, toUtc, ct);
        var result = _mapper.Map<List<OccurrenceDto>>(rows.Where(o => o.StartTime < nowUtc && !o.IsRemoved));

        if (toUtc > nowUtc)
        {
            var liveFrom = fromUtc > nowUtc ? fromUtc : nowUtc;
            var marks = rows
                .Where(o => o.StartTime >= nowUtc && o.ActivityId is not null)
                .ToDictionary(o => (o.ActivityId!.Value, o.StartTime));

            foreach (var activity in await _activities.GetByUserIdAsync(userId, liveFrom, toUtc, ct))
            {
                foreach (var start in OccurrenceExpander.StartsUtc(activity, liveFrom, toUtc, zone))
                {
                    var mark = marks.GetValueOrDefault((activity.ActivityId, start));
                    if (mark?.IsRemoved == true)
                    {
                        continue;
                    }

                    var occurrence = _mapper.Map<OccurrenceDto>(activity);
                    occurrence.StartTime = start;
                    occurrence.Status = mark?.Status ?? OccurrenceExpander.DefaultStatus(activity);
                    result.Add(occurrence);
                }
            }
        }

        return result.OrderBy(o => o.StartTime).ToList();
    }

    public async Task<IUnitOfWorkTransaction> BeginWriteAsync(Guid userId, CancellationToken ct = default)
    {
        var transaction = await _uow.BeginTransactionAsync(ct);
        await _occurrences.LockUserHistoryAsync(userId, ct);
        return transaction;
    }

    public async Task RecordPastAsync(Guid userId, CancellationToken ct = default) =>
        await RecordPastAsync(userId, DateTime.UtcNow, await FindZoneAsync(userId, null, ct), ct);

    public async Task<Status?> ReleaseAsync(Activity activity, bool staysSeries, DateTime? newStartUtc = null,
        CancellationToken ct = default)
    {
        var nowUtc = DateTime.UtcNow;
        var wasSeries = OccurrenceExpander.IsSeries(activity);
        Status? mark = null;

        foreach (var row in await _occurrences.GetByActivityIdsAsync([activity.ActivityId], ct: ct))
        {
            // The form drops seconds, so the same occurrence can come back a few seconds earlier. A deleted occurrence
            // is not linked to the new start: the activity there is shown.
            if (wasSeries != staysSeries && !row.IsRemoved && newStartUtc is { } newStart && SameMinute(row.StartTime, newStart))
            {
                if (wasSeries && row.Status != OccurrenceExpander.DefaultStatus(activity))
                {
                    mark = row.Status;
                }

                if (row.StartTime < nowUtc && newStart < nowUtc)
                {
                    row.StartTime = newStart;
                    continue;
                }
            }

            if (!wasSeries || row.StartTime >= nowUtc)
            {
                await _occurrences.DeleteAsync(row, ct);
            }
            else if (!staysSeries)
            {
                row.ActivityId = null;
                row.Activity = null;
            }
        }

        if (!wasSeries || !staysSeries)
        {
            activity.HistoryRecordedUntil = null;
        }

        return mark;
    }

    public async Task RecordTodayOfMovedSeriesAsync(Activity series, CancellationToken ct = default)
    {
        var nowUtc = DateTime.UtcNow;
        var zone = await FindZoneAsync(series.UserId, null, ct);
        var todayUtc = TimeZones.ToUtc(TimeZones.ToLocal(nowUtc, zone).Date, zone);

        var start = OccurrenceExpander.StartsUtc(series, todayUtc, nowUtc, zone).Cast<DateTime?>().FirstOrDefault();
        if (start is null)
        {
            return;
        }

        // Rows of later today were released with the old pattern; a row before now means today has already been counted.
        var rows = await _occurrences.GetByActivityIdsAsync([series.ActivityId], todayUtc, ct);
        if (!rows.Any(o => o.StartTime < nowUtc))
        {
            await _occurrences.AddAsync(Snapshot(new ActivityOccurrence(), series, start.Value), ct);
        }
    }

    public async Task<Status?> SetOccurrenceStatusAsync(Activity series, DateTime startUtc, Status status,
        CancellationToken ct = default)
    {
        var row = await FindOccurrenceAsync(series, startUtc, ct);
        if (row is null)
        {
            return null;
        }

        var previous = row.Status;
        row.Status = status;
        return previous;
    }

    // Limit: the planner and its workload warnings still count the deleted occurrence as busy time, because they
    // expand the series from its pattern (PlanningService.BuildContextAsync). Upgrade: pass the removed starts into
    // TimetableEntry and skip them in RecurrenceExpander.
    public async Task<bool> RemoveOccurrenceAsync(Activity series, DateTime startUtc, CancellationToken ct = default)
    {
        var row = await FindOccurrenceAsync(series, startUtc, ct);
        if (row is null)
        {
            return false;
        }

        row.IsRemoved = true;
        return true;
    }

    // The history row of one occurrence of a series; a coming occurrence gets one. Null when the series has no
    // occurrence there, also when it was deleted.
    private async Task<ActivityOccurrence?> FindOccurrenceAsync(Activity series, DateTime startUtc, CancellationToken ct)
    {
        // Browsers send milliseconds; the stored times may be finer.
        var from = ToUtc(startUtc).AddSeconds(-1);
        var to = from.AddSeconds(2);
        var row = (await _occurrences.GetByActivityIdsAsync([series.ActivityId], from, ct))
            .FirstOrDefault(o => o.StartTime < to);

        if (row is null)
        {
            // Every started occurrence is recorded already; a later one must be part of the series.
            var zone = await FindZoneAsync(series.UserId, null, ct);
            var start = OccurrenceExpander.StartsUtc(series, from, to, zone).Cast<DateTime?>().FirstOrDefault();
            if (start is null || start < DateTime.UtcNow)
            {
                return null;
            }

            row = Snapshot(new ActivityOccurrence(), series, start.Value);
            await _occurrences.AddAsync(row, ct);
        }

        return row.IsRemoved ? null : row;
    }

    // A series can have years of history: the rows are deleted in the database without loading them.
    public Task ForgetActivityAsync(Activity activity, CancellationToken ct = default) =>
        _occurrences.DeleteByActivityIdAsync(activity.ActivityId, ct);

    public Task ForgetSubjectAsync(Guid subjectId, Guid userId, CancellationToken ct = default) =>
        _occurrences.DeleteOfSubjectAsync(subjectId, userId, ct);

    public async Task<bool> DeleteDetachedOccurrenceAsync(Guid occurrenceId, Guid userId, CancellationToken ct = default)
    {
        await using var transaction = await BeginWriteAsync(userId, ct);

        var row = await _occurrences.GetDetachedAsync(occurrenceId, userId, ct);
        if (row is null)
        {
            return false;
        }

        await _occurrences.DeleteAsync(row, ct);
        await _uow.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return true;
    }

    private async Task RecordPastAsync(Guid userId, DateTime nowUtc, TimeZoneInfo zone, CancellationToken ct)
    {
        // Parallel requests of the same user (several views load at once) would record the same occurrences.
        // Inside a write this joins its transaction; the lock is already held.
        await using var transaction = await BeginWriteAsync(userId, ct);

        var pending = await _activities.GetUnrecordedAsync(userId, nowUtc, ct);
        if (pending.Count == 0)
        {
            return;
        }

        var from = pending.Min(OccurrenceExpander.UnrecordedFromUtc);
        var existing = (await _occurrences.GetByActivityIdsAsync(pending.Select(a => a.ActivityId).ToList(), from, ct))
            .ToDictionary(o => (o.ActivityId!.Value, o.StartTime));

        foreach (var activity in pending)
        {
            var series = OccurrenceExpander.IsSeries(activity);
            foreach (var start in OccurrenceExpander.UnrecordedStartsUtc(activity, nowUtc, zone))
            {
                if (existing.TryGetValue((activity.ActivityId, start), out var row))
                {
                    // A marked occurrence of a series keeps its mark; the rest is taken from the series as it is now.
                    Snapshot(row, activity, start, series ? row.Status : activity.Status);
                }
                else
                {
                    await _occurrences.AddAsync(Snapshot(new ActivityOccurrence(), activity, start), ct);
                }
            }

            activity.HistoryRecordedUntil = nowUtc;
        }

        await _uow.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }

    private static bool SameMinute(DateTime a, DateTime b) =>
        a.Ticks / TimeSpan.TicksPerMinute == b.Ticks / TimeSpan.TicksPerMinute;

    private static ActivityOccurrence Snapshot(ActivityOccurrence row, Activity activity, DateTime startUtc, Status? status = null)
    {
        row.UserId = activity.UserId;
        row.ActivityId = activity.ActivityId;
        row.SubjectId = activity.SubjectId;
        row.Title = activity.Title;
        row.ActivityTypeId = activity.ActivityTypeId;
        row.StartTime = startUtc;
        row.DurationMinutes = activity.DurationMinutes;
        row.Status = status ?? OccurrenceExpander.DefaultStatus(activity);
        return row;
    }

    // The zone sent by the browser is remembered for later requests that do not send one.
    private async Task<TimeZoneInfo> FindZoneAsync(Guid userId, string? requested, CancellationToken ct)
    {
        var user = await _users.GetByIdAsync(userId, ct);
        var zone = TimeZones.Find(requested);
        if (zone is not null && user is not null && user.TimeZone != requested)
        {
            user.TimeZone = requested;
            await _uow.SaveChangesAsync(ct);
        }

        return zone ?? TimeZones.Find(user?.TimeZone) ?? TimeZoneInfo.Utc;
    }

    private static DateTime ToUtc(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Local => value.ToUniversalTime(),
        _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
    };
}
