using MedApp.DAL.Context;
using MedApp.Models.Models;
using MedApp.Services.Repositories;

namespace MedApp.DAL.Repositories;

public class RecurringOptionsRepository : IRecurringOptionsRepository
{
    private readonly MedAppDbContext _db;

    public RecurringOptionsRepository(MedAppDbContext db)
    {
        _db = db;
    }

    public Task DeleteAsync(RecurringOptions options, CancellationToken ct = default)
    {
        _db.RecurringOptions.Remove(options);
        return Task.CompletedTask;
    }
}
