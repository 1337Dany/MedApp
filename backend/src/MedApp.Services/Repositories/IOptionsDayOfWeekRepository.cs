using MedApp.Models.Models;
using MedApp.Models.Models.Enums;

namespace MedApp.Services.Repositories;

public interface IOptionsDayOfWeekRepository
{
    Task<IEnumerable<OptionsDayOfWeek>> GetByRecurringOptionsIdAsync(Guid recurringOptionsId, CancellationToken ct = default);

    Task AddAsync(OptionsDayOfWeek options, CancellationToken ct = default);

    Task DeleteAsync(Guid recurringOptionsId, CancellationToken ct = default);

    Task DeleteAsync(Guid recurringOptionsId, DayOfWeekEnum dayOfWeek, CancellationToken ct = default);
}

