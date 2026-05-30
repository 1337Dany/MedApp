using MedApp.DAL.Context;
using MedApp.Models.Models;
using MedApp.Services.Repositories;
using Microsoft.EntityFrameworkCore;

namespace MedApp.DAL.Repositories;

public class OptionsDayOfWeekRepository : IOptionsDayOfWeekRepository
{
    private readonly MedAppDbContext _db;

    public OptionsDayOfWeekRepository(MedAppDbContext db)
    {
        _db = db;
    }

    public Task<IEnumerable<OptionsDayOfWeek>> GetByRecurringOptionsIdAsync(Guid recurringOptionsId, CancellationToken ct = default) =>
        _db.OptionsDayOfWeek
            .Where(o => o.RecurringOptionsId == recurringOptionsId)
            .ToListAsync(ct)
            .ContinueWith(t => (IEnumerable<OptionsDayOfWeek>)t.Result, ct);

    public Task AddAsync(OptionsDayOfWeek options, CancellationToken ct = default)
    {
        _db.OptionsDayOfWeek.Add(options);
        return Task.CompletedTask;
    }

    public async Task DeleteAsync(Guid recurringOptionsId, CancellationToken ct = default)
    {
        var items = await _db.OptionsDayOfWeek
            .Where(o => o.RecurringOptionsId == recurringOptionsId)
            .ToListAsync(ct);

        if (items.Any()) _db.OptionsDayOfWeek.RemoveRange(items);
    }
}

