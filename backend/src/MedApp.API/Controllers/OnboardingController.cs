using FluentValidation;
using MedApp.Services.DTOs.Onboarding;
using MedApp.Services.DTOs.Users;
using MedApp.Services.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedApp.API.Controllers;

[Route("api/onboarding")]
[Authorize]
public class OnboardingController : ApiControllerBase
{
    private readonly IOnboardingService _onboarding;
    private readonly IValidator<DemoDataRequest> _validator;

    public OnboardingController(IOnboardingService onboarding, IValidator<DemoDataRequest> validator)
    {
        _onboarding = onboarding;
        _validator = validator;
    }

    [HttpPost("demo-data")]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> LoadDemoData([FromBody] DemoDataRequest request, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        if (await ValidateAsync(_validator, request, ct) is { } invalid)
        {
            return invalid;
        }

        var result = await _onboarding.LoadDemoDataAsync(userId, request.TimeZone, ct);
        return result.Succeeded ? Ok(result.Value) : MapFailure(result);
    }

    [HttpPost("complete")]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Complete(CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var result = await _onboarding.CompleteAsync(userId, ct);
        return result.Succeeded ? Ok(result.Value) : MapFailure(result);
    }
}
