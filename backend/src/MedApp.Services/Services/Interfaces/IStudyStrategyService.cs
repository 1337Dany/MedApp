using MedApp.Services.DTOs.Lookups;

namespace MedApp.Services.Services;

public interface IStudyStrategyService
{
    Task<IEnumerable<LookupDto>> GetAllAsync(CancellationToken ct = default);
}
