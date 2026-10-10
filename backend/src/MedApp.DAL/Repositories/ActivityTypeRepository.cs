using MedApp.DAL.Context;
using MedApp.Models.Models;
using MedApp.Services.Repositories;
using Microsoft.EntityFrameworkCore;

namespace MedApp.DAL.Repositories;

public class ActivityTypeRepository : IActivityTypeRepository
{
    private readonly MedAppDbContext _db;

    public ActivityTypeRepository(MedAppDbContext db)
    {
        _db = db;
    }

    public async Task<IEnumerable<ActivityType>> GetAllAsync(CancellationToken ct = default) =>
        await _db.ActivityTypes.AsNoTracking().OrderBy(t => t.TypeId).ToListAsync(ct);

    public Task<bool> ExistsAsync(int id, CancellationToken ct = default) =>
        _db.ActivityTypes.AnyAsync(t => t.TypeId == id, ct);
}
