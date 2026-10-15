using FluentValidation;
using MedApp.Services.DTOs.Activities;
using MedApp.Services.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedApp.API.Controllers;

[Route("api/activities")]
[Authorize]
public class ActivitiesController : ApiControllerBase
{
    private readonly IActivityService _activities;
    private readonly IValidator<ActivityRequest> _validator;
    private readonly IValidator<ActivityStatusRequest> _statusValidator;

    public ActivitiesController(
        IActivityService activities,
        IValidator<ActivityRequest> validator,
        IValidator<ActivityStatusRequest> statusValidator)
    {
        _activities = activities;
        _validator = validator;
        _statusValidator = statusValidator;
    }

    // Optional [from, to) window (UTC). Recurring series that can occur inside it are included as one row each.
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<ActivityDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll([FromQuery] DateTime? from, [FromQuery] DateTime? to, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _activities.GetAllAsync(userId, from, to, ct));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ActivityDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var activity = await _activities.GetByIdAsync(id, userId, ct);
        return activity is null ? NotFound() : Ok(activity);
    }

    [HttpPost]
    [ProducesResponseType(typeof(ActivityDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] ActivityRequest request, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        if (await ValidateAsync(_validator, request, ct) is { } invalid)
        {
            return invalid;
        }

        var result = await _activities.CreateAsync(userId, request, ct);
        return result.Succeeded
            ? CreatedAtAction(nameof(GetById), new { id = result.Value!.Id }, result.Value)
            : MapFailure(result);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(ActivityDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, [FromBody] ActivityRequest request, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        if (await ValidateAsync(_validator, request, ct) is { } invalid)
        {
            return invalid;
        }

        var result = await _activities.UpdateAsync(id, userId, request, ct);
        return result.Succeeded ? Ok(result.Value) : MapFailure(result);
    }

    [HttpPatch("{id:guid}/status")]
    [ProducesResponseType(typeof(ActivityDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] ActivityStatusRequest request, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        if (await ValidateAsync(_statusValidator, request, ct) is { } invalid)
        {
            return invalid;
        }

        var activity = await _activities.UpdateStatusAsync(id, userId, request.Status, ct);
        return activity is null ? NotFound() : Ok(activity);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return await _activities.DeleteAsync(id, userId, ct) ? NoContent() : NotFound();
    }
}
