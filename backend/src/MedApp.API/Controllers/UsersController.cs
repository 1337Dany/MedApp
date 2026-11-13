using FluentValidation;
using MedApp.Models.Models.Enums;
using MedApp.Services.DTOs.Users;
using MedApp.Services.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace MedApp.API.Controllers;

[Route("api/users")]
[Authorize]
public class UsersController : ApiControllerBase
{
    private readonly IUserService _users;
    private readonly IValidator<UpdateProfileRequest> _profileValidator;
    private readonly IValidator<UpdateRoleRequest> _roleValidator;
    private readonly IValidator<DeleteAccountRequest> _deleteValidator;

    public UsersController(
        IUserService users,
        IValidator<UpdateProfileRequest> profileValidator,
        IValidator<UpdateRoleRequest> roleValidator,
        IValidator<DeleteAccountRequest> deleteValidator)
    {
        _deleteValidator = deleteValidator;
        _users = users;
        _profileValidator = profileValidator;
        _roleValidator = roleValidator;
    }

    // Own profile, including the data-sharing consent used by teacher analytics.
    [HttpPut("me")]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateProfileRequest request, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        if (await ValidateAsync(_profileValidator, request, ct) is { } invalid)
        {
            return invalid;
        }

        var user = await _users.UpdateProfileAsync(userId, request, ct);
        return user is null ? Unauthorized() : Ok(user);
    }

    // Deletes the caller's account and all its data; the password in the body confirms it. Cannot be undone.
    [HttpDelete("me")]
    [EnableRateLimiting(AuthController.RateLimitPolicy)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteMe([FromBody] DeleteAccountRequest request, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        if (await ValidateAsync(_deleteValidator, request, ct) is { } invalid)
        {
            return invalid;
        }

        var result = await _users.DeleteAccountAsync(userId, request, ct);
        return result.Succeeded ? NoContent() : MapFailure(result);
    }

    [HttpGet]
    [Authorize(Roles = nameof(UserRole.Admin))]
    [ProducesResponseType(typeof(IEnumerable<UserDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetAll(CancellationToken ct) => Ok(await _users.GetAllAsync(ct));

    [HttpPut("{id:guid}/role")]
    [Authorize(Roles = nameof(UserRole.Admin))]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SetRole(Guid id, [FromBody] UpdateRoleRequest request, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        if (await ValidateAsync(_roleValidator, request, ct) is { } invalid)
        {
            return invalid;
        }

        var result = await _users.SetRoleAsync(id, userId, request.Role, ct);
        return result.Succeeded ? Ok(result.Value) : MapFailure(result);
    }
}
