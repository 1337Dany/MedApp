using MedApp.Services.DTOs.Lookups;

namespace MedApp.Services.Services;

public interface IActivityTypeService
{
    Task<IEnumerable<LookupDto>> GetAllAsync(CancellationToken ct = default);
}
