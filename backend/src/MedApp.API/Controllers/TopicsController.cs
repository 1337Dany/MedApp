using FluentValidation;
using MedApp.Services.DTOs.Topics;
using MedApp.Services.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedApp.API.Controllers;

[Route("api")]
[Authorize]
public class TopicsController : ApiControllerBase
{
    private readonly ITopicService _topics;
    private readonly IValidator<TopicRequest> _validator;

    public TopicsController(ITopicService topics, IValidator<TopicRequest> validator)
    {
        _topics = topics;
        _validator = validator;
    }

    // All of the caller's topics, or one subject's with ?subjectId=.
    [HttpGet("topics")]
    [ProducesResponseType(typeof(IEnumerable<TopicDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll([FromQuery] Guid? subjectId, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _topics.GetAllAsync(userId, subjectId, ct));
    }

    [HttpGet("subjects/{subjectId:guid}/topics")]
    [ProducesResponseType(typeof(IEnumerable<TopicDto>), StatusCodes.Status200OK)]
    public Task<IActionResult> GetForSubject(Guid subjectId, CancellationToken ct) => GetAll(subjectId, ct);

    [HttpGet("topics/{id:guid}")]
    [ProducesResponseType(typeof(TopicDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var topic = await _topics.GetByIdAsync(id, userId, ct);
        return topic is null ? NotFound() : Ok(topic);
    }

    [HttpPost("subjects/{subjectId:guid}/topics")]
    [ProducesResponseType(typeof(TopicDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Create(Guid subjectId, [FromBody] TopicRequest request, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        if (await ValidateAsync(_validator, request, ct) is { } invalid)
        {
            return invalid;
        }

        var topic = await _topics.CreateAsync(subjectId, userId, request, ct);
        return topic is null ? NotFound() : CreatedAtAction(nameof(GetById), new { id = topic.Id }, topic);
    }

    [HttpPut("topics/{id:guid}")]
    [ProducesResponseType(typeof(TopicDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, [FromBody] TopicRequest request, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        if (await ValidateAsync(_validator, request, ct) is { } invalid)
        {
            return invalid;
        }

        var topic = await _topics.UpdateAsync(id, userId, request, ct);
        return topic is null ? NotFound() : Ok(topic);
    }

    [HttpDelete("topics/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return await _topics.DeleteAsync(id, userId, ct) ? NoContent() : NotFound();
    }
}
