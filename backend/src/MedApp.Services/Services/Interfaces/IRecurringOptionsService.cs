using MedApp.Models.Models;

namespace MedApp.Services.Services;

public interface IRecurringOptionsService
{
    Task<RecurringOptions?> GetByIdAsync(Guid recurringOptionsId, CancellationToken ct = default);
    Task<IEnumerable<RecurringOptions>> GetAllAsync(CancellationToken ct = default);
    Task<RecurringOptions> AddAsync(RecurringOptions recurringOptions, CancellationToken ct = default);
    Task UpdateAsync(RecurringOptions recurringOptions, CancellationToken ct = default);
    Task DeleteAsync(Guid recurringOptionsId, CancellationToken ct = default);
}

