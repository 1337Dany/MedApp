using FluentValidation;
using MedApp.Services.DTOs.History;
using MedApp.Services.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedApp.API.Controllers;

// Concrete occurrences of the caller's activities, for the calendar and analytics (rules: docs/ANALYTICS.md).
[Route("api/occurrences")]
[Authorize]
public class OccurrencesController : ApiControllerBase
{
    private readonly IActivityHistoryService _history;
    private readonly IValidator<OccurrencesQuery> _validator;

    public OccurrencesController(IActivityHistoryService history, IValidator<OccurrencesQuery> validator)
    {
        _history = history;
        _validator = validator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<OccurrenceDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Get([FromQuery] OccurrencesQuery query, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        if (await ValidateAsync(_validator, query, ct) is { } invalid)
        {
            return invalid;
        }

        return Ok(await _history.GetOccurrencesAsync(userId, query, ct));
    }
}
