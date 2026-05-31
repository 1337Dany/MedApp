using MedApp.Models.Models;

namespace MedApp.Services.Repositories;

public interface IRecurringOptionsRepository
{
    Task<RecurringOptions?> GetByIdAsync(Guid id, CancellationToken ct = default);

    Task<IEnumerable<RecurringOptions>> GetAllAsync(CancellationToken ct = default);

    Task AddAsync(RecurringOptions options, CancellationToken ct = default);

    Task UpdateAsync(RecurringOptions options, CancellationToken ct = default);

    Task DeleteAsync(Guid id, CancellationToken ct = default);
}

