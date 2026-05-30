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

    public Task<StudyStrategy?> GetByIdAsync(int id, CancellationToken ct = default) =>
        _db.StudyStrategies.FirstOrDefaultAsync(s => s.MethodId == id, ct);

    public Task<IEnumerable<StudyStrategy>> GetAllAsync(CancellationToken ct = default) =>
        _db.StudyStrategies.ToListAsync(ct).ContinueWith(t => (IEnumerable<StudyStrategy>)t.Result, ct);

    public Task AddAsync(StudyStrategy strategy, CancellationToken ct = default)
    {
        _db.StudyStrategies.Add(strategy);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(StudyStrategy strategy, CancellationToken ct = default)
    {
        _db.StudyStrategies.Update(strategy);
        return Task.CompletedTask;
    }

    public async Task DeleteAsync(int id, CancellationToken ct = default)
    {
        var entity = await _db.StudyStrategies.FindAsync(new object[] { id }, ct);
        if (entity is not null) _db.StudyStrategies.Remove(entity);
    }
}

