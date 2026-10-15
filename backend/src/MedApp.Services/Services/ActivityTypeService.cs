using AutoMapper;
using MedApp.Services.DTOs.Lookups;
using MedApp.Services.Repositories;

namespace MedApp.Services.Services;

public class ActivityTypeService : IActivityTypeService
{
    private readonly IActivityTypeRepository _repository;
    private readonly IMapper _mapper;

    public ActivityTypeService(IActivityTypeRepository repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }

    public async Task<IEnumerable<LookupDto>> GetAllAsync(CancellationToken ct = default)
    {
        var types = await _repository.GetAllAsync(ct);
        return _mapper.Map<IEnumerable<LookupDto>>(types);
    }
}
