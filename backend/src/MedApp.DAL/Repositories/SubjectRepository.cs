using MedApp.DAL.Context;
using MedApp.Models.Models;
using MedApp.Services.Repositories;
using Microsoft.EntityFrameworkCore;

namespace MedApp.DAL.Repositories;

public class SubjectRepository : ISubjectRepository
{
    private readonly MedAppDbContext _db;

    public SubjectRepository(MedAppDbContext db)
    {
        _db = db;
    }

    public Task<Subject?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _db.Subjects
            .Include(s => s.Topics)
            .Include(s => s.Activities)
            .FirstOrDefaultAsync(s => s.SubjectId == id, ct);

    public Task<IEnumerable<Subject>> GetByUserIdAsync(Guid userId, CancellationToken ct = default) =>
        _db.Subjects.Where(s => s.UserId == userId).ToListAsync(ct).ContinueWith(t => (IEnumerable<Subject>)t.Result, ct);

    public Task<IEnumerable<Subject>> GetAllAsync(CancellationToken ct = default) =>
        _db.Subjects.ToListAsync(ct).ContinueWith(t => (IEnumerable<Subject>)t.Result, ct);

    public Task AddAsync(Subject subject, CancellationToken ct = default)
    {
        _db.Subjects.Add(subject);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(Subject subject, CancellationToken ct = default)
    {
        _db.Subjects.Update(subject);
        return Task.CompletedTask;
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.Subjects.FindAsync(new object[] { id }, ct);
        if (entity is not null) _db.Subjects.Remove(entity);
    }
}

