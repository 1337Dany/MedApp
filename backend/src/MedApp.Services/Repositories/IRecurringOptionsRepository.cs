using MedApp.Models.Models;

namespace MedApp.Services.Repositories;

public interface IRecurringOptionsRepository
{
    // Days of week are removed with it (cascade).
    Task DeleteAsync(RecurringOptions options, CancellationToken ct = default);
}
