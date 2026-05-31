using MedApp.Models.Models;
using MedApp.Services.Repositories;

namespace MedApp.Services.Services;

public class SubjectService : ISubjectService
{
    private readonly ISubjectRepository _repository;
    private readonly IUnitOfWork _uow;

    public SubjectService(ISubjectRepository repository, IUnitOfWork uow)
    {
        _repository = repository;
        _uow = uow;
    }

    public async Task<Subject?> GetByIdAsync(Guid subjectId, CancellationToken ct = default)
    {
        return await _repository.GetByIdAsync(subjectId, ct);
    }

    public async Task<IEnumerable<Subject>> GetByUserIdAsync(Guid userId, CancellationToken ct = default)
    {
        return await _repository.GetByUserIdAsync(userId, ct);
    }

    public async Task<IEnumerable<Subject>> GetAllAsync(CancellationToken ct = default)
    {
        var subjects = await _repository.GetAllAsync(ct);
        return subjects;
    }

    public async Task<Subject> AddAsync(Subject subject, CancellationToken ct = default)
    {
        subject.SubjectId = Guid.NewGuid();
        await _repository.AddAsync(subject, ct);
        await _uow.SaveChangesAsync(ct);
        return subject;
    }

    public async Task UpdateAsync(Subject subject, CancellationToken ct = default)
    {
        await _repository.UpdateAsync(subject, ct);
        await _uow.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(Guid subjectId, CancellationToken ct = default)
    {
        await _repository.DeleteAsync(subjectId, ct);
        await _uow.SaveChangesAsync(ct);
    }
}

