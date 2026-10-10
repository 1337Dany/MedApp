using MedApp.DAL.Context;
using MedApp.Models.Models;
using MedApp.Services.Repositories;
using Microsoft.EntityFrameworkCore;

namespace MedApp.DAL.Repositories;

public class TopicRepository : ITopicRepository
{
    private readonly MedAppDbContext _db;

    public TopicRepository(MedAppDbContext db)
    {
        _db = db;
    }

    public Task<Topic?> GetByIdAsync(Guid id, Guid userId, CancellationToken ct = default) =>
        _db.Topics.FirstOrDefaultAsync(t => t.TopicId == id && t.Subject.UserId == userId, ct);

    public async Task<IEnumerable<Topic>> GetByUserIdAsync(Guid userId, Guid? subjectId = null, CancellationToken ct = default) =>
        await _db.Topics
            .Where(t => t.Subject.UserId == userId && (subjectId == null || t.SubjectId == subjectId))
            .OrderBy(t => t.SubjectId)
            .ThenBy(t => t.Order)
            .ToListAsync(ct);

    public Task<int?> GetMaxOrderAsync(Guid subjectId, CancellationToken ct = default) =>
        _db.Topics
            .Where(t => t.SubjectId == subjectId)
            .MaxAsync(t => (int?)t.Order, ct);

    public Task AddAsync(Topic topic, CancellationToken ct = default)
    {
        _db.Topics.Add(topic);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(Topic topic, CancellationToken ct = default)
    {
        _db.Topics.Remove(topic);
        return Task.CompletedTask;
    }
}
