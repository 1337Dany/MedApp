using MedApp.Models.Models;
using MedApp.Models.Models.Enums;

namespace MedApp.Services.Services;

public interface IOptionsDayOfWeekService
{
    Task<IEnumerable<OptionsDayOfWeek>> GetByRecurringOptionsIdAsync(Guid recurringOptionsId, CancellationToken ct = default);
    Task AddAsync(OptionsDayOfWeek dayOfWeek, CancellationToken ct = default);
    Task RemoveAsync(Guid recurringOptionsId, DayOfWeekEnum dayOfWeek, CancellationToken ct = default);
    Task DeleteByRecurringOptionsIdAsync(Guid recurringOptionsId, CancellationToken ct = default);
}

