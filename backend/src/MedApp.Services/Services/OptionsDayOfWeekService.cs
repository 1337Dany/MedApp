using MedApp.Models.Models;
using MedApp.Models.Models.Enums;
using MedApp.Services.Repositories;

namespace MedApp.Services.Services;

public class OptionsDayOfWeekService : IOptionsDayOfWeekService
{
    private readonly IOptionsDayOfWeekRepository _repository;
    private readonly IUnitOfWork _uow;

    public OptionsDayOfWeekService(IOptionsDayOfWeekRepository repository, IUnitOfWork uow)
    {
        _repository = repository;
        _uow = uow;
    }

    public async Task<IEnumerable<OptionsDayOfWeek>> GetByRecurringOptionsIdAsync(Guid recurringOptionsId,
        CancellationToken ct = default)
    {
        return await _repository.GetByRecurringOptionsIdAsync(recurringOptionsId, ct);
    }
    
    public async Task AddAsync(OptionsDayOfWeek dayOfWeek, CancellationToken ct = default)
    {
        await _repository.AddAsync(dayOfWeek, ct);
        await _uow.SaveChangesAsync(ct);
    }

    public async Task RemoveAsync(Guid recurringOptionsId, DayOfWeekEnum dayOfWeek, CancellationToken ct = default)
    {
        var existing = await _repository.GetByRecurringOptionsIdAsync(recurringOptionsId, ct);
        var toRemove = existing.FirstOrDefault(d => d.DayOfWeek == dayOfWeek);

        if (toRemove != null)
        {
            var days = await _repository.GetByRecurringOptionsIdAsync(recurringOptionsId, ct);
            foreach (var day in days.Where(d => d.DayOfWeek == dayOfWeek))
            {
                await _repository.DeleteAsync(recurringOptionsId, ct);
            }

            await _uow.SaveChangesAsync(ct);
        }
    }

    public async Task DeleteByRecurringOptionsIdAsync(Guid recurringOptionsId, CancellationToken ct = default)
    {
        await _repository.DeleteAsync(recurringOptionsId, ct);
        await _uow.SaveChangesAsync(ct);
    }
}