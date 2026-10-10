using MedApp.DAL.Context;
using MedApp.Models.Models;
using MedApp.Services.Repositories;
using Microsoft.EntityFrameworkCore;

namespace MedApp.DAL.Repositories;

public class StudyStrategyRepository : IStudyStrategyRepository
{
    private readonly MedAppDbContext _db;

    public StudyStrategyRepository(MedAppDbContext db)
    {
        _db = db;
    }

    public async Task<IEnumerable<StudyStrategy>> GetAllAsync(CancellationToken ct = default) =>
        await _db.StudyStrategies.AsNoTracking().OrderBy(s => s.MethodId).ToListAsync(ct);

    public Task<bool> ExistsAsync(int id, CancellationToken ct = default) =>
        _db.StudyStrategies.AnyAsync(s => s.MethodId == id, ct);
}
