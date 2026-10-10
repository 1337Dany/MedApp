using FluentValidation;
using MedApp.Services.DTOs.Subjects;
using MedApp.Services.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedApp.API.Controllers;

[Route("api/subjects")]
[Authorize]
public class SubjectsController : ApiControllerBase
{
    private readonly ISubjectService _subjects;
    private readonly IValidator<SubjectRequest> _validator;

    public SubjectsController(ISubjectService subjects, IValidator<SubjectRequest> validator)
    {
        _subjects = subjects;
        _validator = validator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<SubjectDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return Ok(await _subjects.GetAllAsync(userId, ct));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(SubjectDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var subject = await _subjects.GetByIdAsync(id, userId, ct);
        return subject is null ? NotFound() : Ok(subject);
    }

    [HttpPost]
    [ProducesResponseType(typeof(SubjectDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] SubjectRequest request, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        if (await ValidateAsync(_validator, request, ct) is { } invalid)
        {
            return invalid;
        }

        var subject = await _subjects.CreateAsync(userId, request, ct);
        return CreatedAtAction(nameof(GetById), new { id = subject.Id }, subject);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(SubjectDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, [FromBody] SubjectRequest request, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        if (await ValidateAsync(_validator, request, ct) is { } invalid)
        {
            return invalid;
        }

        var subject = await _subjects.UpdateAsync(id, userId, request, ct);
        return subject is null ? NotFound() : Ok(subject);
    }

    // Also deletes the subject's topics and activities.
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        return await _subjects.DeleteAsync(id, userId, ct) ? NoContent() : NotFound();
    }
}
