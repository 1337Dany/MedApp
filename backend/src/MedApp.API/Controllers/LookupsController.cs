using MedApp.Services.DTOs.Lookups;
using MedApp.Services.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedApp.API.Controllers;

// Read-only lookup tables seeded by migrations.
[Route("api")]
[Authorize]
public class LookupsController : ApiControllerBase
{
    private readonly IStudyStrategyService _studyStrategies;
    private readonly IActivityTypeService _activityTypes;

    public LookupsController(IStudyStrategyService studyStrategies, IActivityTypeService activityTypes)
    {
        _studyStrategies = studyStrategies;
        _activityTypes = activityTypes;
    }

    [HttpGet("study-strategies")]
    [ProducesResponseType(typeof(IEnumerable<LookupDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStudyStrategies(CancellationToken ct) =>
        Ok(await _studyStrategies.GetAllAsync(ct));

    [HttpGet("activity-types")]
    [ProducesResponseType(typeof(IEnumerable<LookupDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetActivityTypes(CancellationToken ct) =>
        Ok(await _activityTypes.GetAllAsync(ct));
}
