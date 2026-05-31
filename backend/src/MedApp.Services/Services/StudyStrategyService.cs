using MedApp.Models.Models;
using MedApp.Services.Repositories;

namespace MedApp.Services.Services;

public class StudyStrategyService : IStudyStrategyService
{
    private readonly IStudyStrategyRepository _repository;
    private readonly IUnitOfWork _uow;

    public StudyStrategyService(IStudyStrategyRepository repository, IUnitOfWork uow)
    {
        _repository = repository;
        _uow = uow;
    }

    public async Task<StudyStrategy?> GetByIdAsync(int methodId, CancellationToken ct = default)
    {
        return await _repository.GetByIdAsync(methodId, ct);
    }

    public async Task<IEnumerable<StudyStrategy>> GetAllAsync(CancellationToken ct = default)
    {
        return await _repository.GetAllAsync(ct);
    }

    public async Task<StudyStrategy> AddAsync(StudyStrategy strategy, CancellationToken ct = default)
    {
        await _repository.AddAsync(strategy, ct);
        await _uow.SaveChangesAsync(ct);
        return strategy;
    }

    public async Task UpdateAsync(StudyStrategy strategy, CancellationToken ct = default)
    {
        await _repository.UpdateAsync(strategy, ct);
        await _uow.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(int methodId, CancellationToken ct = default)
    {
        await _repository.DeleteAsync(methodId, ct);
        await _uow.SaveChangesAsync(ct);
    }
}

