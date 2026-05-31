using MedApp.DAL.Context;
using MedApp.Models.Models;
using MedApp.Services.Repositories;
using Microsoft.EntityFrameworkCore;

namespace MedApp.DAL.Repositories;

public class RecurringOptionsRepository : IRecurringOptionsRepository
{
    private readonly MedAppDbContext _db;

    public RecurringOptionsRepository(MedAppDbContext db)
    {
        _db = db;
    }

    public Task<RecurringOptions?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _db.RecurringOptions
            .Include(ro => ro.DaysOfWeek)
            .Include(ro => ro.Activities)
            .FirstOrDefaultAsync(ro => ro.RecurringOptionsId == id, ct);

    public Task<IEnumerable<RecurringOptions>> GetAllAsync(CancellationToken ct = default) =>
        _db.RecurringOptions.ToListAsync(ct).ContinueWith(t => (IEnumerable<RecurringOptions>)t.Result, ct);

    public Task AddAsync(RecurringOptions options, CancellationToken ct = default)
    {
        _db.RecurringOptions.Add(options);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(RecurringOptions options, CancellationToken ct = default)
    {
        _db.RecurringOptions.Update(options);
        return Task.CompletedTask;
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.RecurringOptions.FindAsync(new object[] { id }, ct);
        if (entity is not null) _db.RecurringOptions.Remove(entity);
    }
}

