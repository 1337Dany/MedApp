using AutoMapper;
using MedApp.Services.DTOs.Lookups;
using MedApp.Services.Repositories;

namespace MedApp.Services.Services;

public class StudyStrategyService : IStudyStrategyService
{
    private readonly IStudyStrategyRepository _repository;
    private readonly IMapper _mapper;

    public StudyStrategyService(IStudyStrategyRepository repository, IMapper mapper)
    {
        _repository = repository;
        _mapper = mapper;
    }

    public async Task<IEnumerable<LookupDto>> GetAllAsync(CancellationToken ct = default)
    {
        var strategies = await _repository.GetAllAsync(ct);
        return _mapper.Map<IEnumerable<LookupDto>>(strategies);
    }
}
