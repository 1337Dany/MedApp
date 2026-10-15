using AutoMapper;
using MedApp.Models.Models;
using MedApp.Services.DTOs.Subjects;
using MedApp.Services.Repositories;

namespace MedApp.Services.Services;

public class SubjectService : ISubjectService
{
    private readonly ISubjectRepository _repository;
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;
    private readonly IPlanningService _planning;

    public SubjectService(ISubjectRepository repository, IUnitOfWork uow, IMapper mapper, IPlanningService planning)
    {
        _repository = repository;
        _uow = uow;
        _mapper = mapper;
        _planning = planning;
    }

    public async Task<IEnumerable<SubjectDto>> GetAllAsync(Guid userId, CancellationToken ct = default)
    {
        var subjects = await _repository.GetByUserIdAsync(userId, ct);
        return _mapper.Map<IEnumerable<SubjectDto>>(subjects);
    }

    public async Task<SubjectDto?> GetByIdAsync(Guid subjectId, Guid userId, CancellationToken ct = default)
    {
        var subject = await _repository.GetByIdAsync(subjectId, userId, ct);
        return subject is null ? null : _mapper.Map<SubjectDto>(subject);
    }

    public async Task<SubjectDto> CreateAsync(Guid userId, SubjectRequest request, CancellationToken ct = default)
    {
        var subject = _mapper.Map<Subject>(request);
        subject.UserId = userId;

        await _repository.AddAsync(subject, ct);
        await _uow.SaveChangesAsync(ct);
        await _planning.ReplanIfActiveAsync(userId, ct);
        return _mapper.Map<SubjectDto>(subject);
    }

    public async Task<SubjectDto?> UpdateAsync(Guid subjectId, Guid userId, SubjectRequest request, CancellationToken ct = default)
    {
        var subject = await _repository.GetByIdAsync(subjectId, userId, ct);
        if (subject is null)
        {
            return null;
        }

        _mapper.Map(request, subject);
        await _uow.SaveChangesAsync(ct);
        // Mode, strategy, priority and exam date all change the plan.
        await _planning.ReplanIfActiveAsync(userId, ct);
        return _mapper.Map<SubjectDto>(subject);
    }

    public async Task<bool> DeleteAsync(Guid subjectId, Guid userId, CancellationToken ct = default)
    {
        var subject = await _repository.GetByIdAsync(subjectId, userId, ct);
        if (subject is null)
        {
            return false;
        }

        // Topics and the subject's activities are removed by the database (cascade).
        await _repository.DeleteAsync(subject, ct);
        await _uow.SaveChangesAsync(ct);
        await _planning.ReplanIfActiveAsync(userId, ct);
        return true;
    }
}
