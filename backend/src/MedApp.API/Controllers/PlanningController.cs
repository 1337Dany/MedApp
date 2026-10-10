using FluentValidation;
using MedApp.Services.DTOs.Planning;
using MedApp.Services.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedApp.API.Controllers;

// Study planner (rules: docs/PLANNING.md).
[Route("api/planning")]
[Authorize]
public class PlanningController : ApiControllerBase
{
    private readonly IPlanningService _planning;
    private readonly IValidator<PlanRequest> _validator;

    public PlanningController(IPlanningService planning, IValidator<PlanRequest> validator)
    {
        _planning = planning;
        _validator = validator;
    }

    // Replaces future auto-planned sessions with a new plan for the next `days` days.
    [HttpPost("generate")]
    [ProducesResponseType(typeof(PlanResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Generate([FromBody] PlanRequest request, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        if (await ValidateAsync(_validator, request, ct) is { } invalid)
        {
            return invalid;
        }

        var result = await _planning.GenerateAsync(userId, request, ct);
        return result is null ? Unauthorized() : Ok(result);
    }

    [HttpGet("warnings")]
    [ProducesResponseType(typeof(IEnumerable<PlanningWarningDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetWarnings([FromQuery] string? timeZone, [FromQuery] int? days, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        if (await ValidateAsync(_validator, new PlanRequest { TimeZone = timeZone, Days = days }, ct) is { } invalid)
        {
            return invalid;
        }

        return Ok(await _planning.GetWarningsAsync(userId, timeZone, days, ct));
    }
}
