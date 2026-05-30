using MedApp.Models.Models;
using MedApp.Services.Repositories;

namespace MedApp.Services.Services;

public class RecurringOptionsService : IRecurringOptionsService
{
    private readonly IRecurringOptionsRepository _repository;
    private readonly IOptionsDayOfWeekRepository _dayOfWeekRepository;
    private readonly IUnitOfWork _uow;

    public RecurringOptionsService(
        IRecurringOptionsRepository repository,
        IOptionsDayOfWeekRepository dayOfWeekRepository,
        IUnitOfWork uow)
    {
        _repository = repository;
        _dayOfWeekRepository = dayOfWeekRepository;
        _uow = uow;
    }

    public async Task<RecurringOptions?> GetByIdAsync(Guid recurringOptionsId, CancellationToken ct = default)
    {
        return await _repository.GetByIdAsync(recurringOptionsId, ct);
    }

    public async Task<IEnumerable<RecurringOptions>> GetAllAsync(CancellationToken ct = default)
    {
        return await _repository.GetAllAsync(ct);
    }

    public async Task<RecurringOptions> AddAsync(RecurringOptions recurringOptions, CancellationToken ct = default)
    {
        recurringOptions.RecurringOptionsId = Guid.NewGuid();
        await _repository.AddAsync(recurringOptions, ct);
        await _uow.SaveChangesAsync(ct);
        return recurringOptions;
    }

    public async Task UpdateAsync(RecurringOptions recurringOptions, CancellationToken ct = default)
    {
        await _repository.UpdateAsync(recurringOptions, ct);
        await _uow.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(Guid recurringOptionsId, CancellationToken ct = default)
    {
        // Cascade delete days of week
        await _dayOfWeekRepository.DeleteAsync(recurringOptionsId, ct);
        await _repository.DeleteAsync(recurringOptionsId, ct);
        await _uow.SaveChangesAsync(ct);
    }
}

