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

    public Task<Topic?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _db.Topics.FirstOrDefaultAsync(t => t.TopicId == id, ct);

    public Task<IEnumerable<Topic>> GetBySubjectIdAsync(Guid subjectId, CancellationToken ct = default) =>
        _db.Topics.Where(t => t.SubjectId == subjectId).ToListAsync(ct).ContinueWith(t => (IEnumerable<Topic>)t.Result, ct);

    public Task<IEnumerable<Topic>> GetAllAsync(CancellationToken ct = default) =>
        _db.Topics.ToListAsync(ct).ContinueWith(t => (IEnumerable<Topic>)t.Result, ct);

    public Task AddAsync(Topic topic, CancellationToken ct = default)
    {
        _db.Topics.Add(topic);
        return Task.CompletedTask;
    }

    public Task UpdateAsync(Topic topic, CancellationToken ct = default)
    {
        _db.Topics.Update(topic);
        return Task.CompletedTask;
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.Topics.FindAsync(new object[] { id }, ct);
        if (entity is not null) _db.Topics.Remove(entity);
    }
}

