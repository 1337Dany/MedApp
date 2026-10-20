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

    public Task<Subject?> GetByIdAsync(Guid id, Guid userId, CancellationToken ct = default) =>
        _db.Subjects.FirstOrDefaultAsync(s => s.SubjectId == id && s.UserId == userId, ct);

    public async Task<IEnumerable<Subject>> GetByUserIdAsync(Guid userId, CancellationToken ct = default) =>
        await _db.Subjects
            .Where(s => s.UserId == userId)
            .OrderBy(s => s.Name)
            .ToListAsync(ct);

    public Task<List<Subject>> GetByUserIdsAsync(IReadOnlyCollection<Guid> userIds, CancellationToken ct = default) =>
        _db.Subjects
            .AsNoTracking()
            .Include(s => s.Topics)
            .Where(s => userIds.Contains(s.UserId))
            .ToListAsync(ct);

    public Task<bool> ExistsAsync(Guid id, Guid userId, CancellationToken ct = default) =>
        _db.Subjects.AnyAsync(s => s.SubjectId == id && s.UserId == userId, ct);

    public Task AddAsync(Subject subject, CancellationToken ct = default)
    {
        _db.Subjects.Add(subject);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(Subject subject, CancellationToken ct = default)
    {
        _db.Subjects.Remove(subject);
        return Task.CompletedTask;
    }
}
