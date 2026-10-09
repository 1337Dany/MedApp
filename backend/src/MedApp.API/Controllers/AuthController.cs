using System.Security.Claims;
using FluentValidation;
using FluentValidation.Results;
using MedApp.Services.DTOs.Auth;
using MedApp.Services.DTOs.Users;
using MedApp.Services.Services.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.RateLimiting;

namespace MedApp.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    public const string RateLimitPolicy = "auth";

    private readonly IAuthService _authService;
    private readonly IValidator<RegisterRequest> _registerValidator;
    private readonly IValidator<LoginRequest> _loginValidator;
    private readonly IValidator<RefreshRequest> _refreshValidator;
    private readonly IValidator<LogoutRequest> _logoutValidator;

    public AuthController(
        IAuthService authService,
        IValidator<RegisterRequest> registerValidator,
        IValidator<LoginRequest> loginValidator,
        IValidator<RefreshRequest> refreshValidator,
        IValidator<LogoutRequest> logoutValidator)
    {
        _authService = authService;
        _registerValidator = registerValidator;
        _loginValidator = loginValidator;
        _refreshValidator = refreshValidator;
        _logoutValidator = logoutValidator;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicy)]
    [ProducesResponseType(typeof(TokenResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        var validation = await _registerValidator.ValidateAsync(request, ct);
        if (!validation.IsValid)
        {
            return ValidationProblem(BuildModelState(validation));
        }

        var result = await _authService.RegisterAsync(request, ct);
        return MapResult(result);
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicy)]
    [ProducesResponseType(typeof(TokenResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var validation = await _loginValidator.ValidateAsync(request, ct);
        if (!validation.IsValid)
        {
            return ValidationProblem(BuildModelState(validation));
        }

        var result = await _authService.LoginAsync(request, ct);
        return MapResult(result);
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(TokenResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest request, CancellationToken ct)
    {
        var validation = await _refreshValidator.ValidateAsync(request, ct);
        if (!validation.IsValid)
        {
            return ValidationProblem(BuildModelState(validation));
        }

        var result = await _authService.RefreshAsync(request, ct);
        return MapResult(result);
    }

    [HttpPost("logout")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Logout([FromBody] LogoutRequest request, CancellationToken ct)
    {
        var validation = await _logoutValidator.ValidateAsync(request, ct);
        if (!validation.IsValid)
        {
            return ValidationProblem(BuildModelState(validation));
        }

        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        // 204 whether or not anything was revoked: don't reveal if a token exists or whose it is.
        await _authService.LogoutAsync(request, userId, ct);
        return NoContent();
    }

    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var user = await _authService.GetUserAsync(userId, ct);
        if (user is null)
        {
            return Unauthorized();
        }

        return Ok(user);
    }

    private bool TryGetUserId(out Guid userId) =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out userId);

    private static ModelStateDictionary BuildModelState(ValidationResult validation)
    {
        var modelState = new ModelStateDictionary();
        foreach (var error in validation.Errors)
        {
            modelState.AddModelError(error.PropertyName, error.ErrorMessage);
        }
        return modelState;
    }

    private IActionResult MapResult(AuthResult result)
    {
        if (result.Succeeded)
        {
            return Ok(result.Tokens);
        }

        return result.Error switch
        {
            AuthError.EmailAlreadyTaken => Conflict(new ProblemDetails
            {
                Title = "Email already in use",
                Detail = result.ErrorMessage,
                Status = StatusCodes.Status409Conflict
            }),
            AuthError.InvalidCredentials => Unauthorized(new ProblemDetails
            {
                Title = "Invalid credentials",
                Detail = result.ErrorMessage,
                Status = StatusCodes.Status401Unauthorized
            }),
            AuthError.InvalidRefreshToken => Unauthorized(new ProblemDetails
            {
                Title = "Invalid refresh token",
                Detail = result.ErrorMessage,
                Status = StatusCodes.Status401Unauthorized
            }),
            _ => BadRequest(new ProblemDetails
            {
                Title = "Authentication failed",
                Detail = result.ErrorMessage,
                Status = StatusCodes.Status400BadRequest
            })
        };
    }
}
