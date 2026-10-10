using System.Security.Claims;
using FluentValidation;
using FluentValidation.Results;
using MedApp.Services.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace MedApp.API.Controllers;

[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    // The caller's id always comes from the access token, never from the request body.
    protected bool TryGetUserId(out Guid userId) =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out userId);

    protected async Task<IActionResult?> ValidateAsync<T>(IValidator<T> validator, T request, CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(request, ct);
        return validation.IsValid ? null : ValidationProblem(BuildModelState(validation));
    }

    protected IActionResult MapFailure<T>(ServiceResult<T> result) => result.Error switch
    {
        ServiceError.NotFound => NotFound(new ProblemDetails
        {
            Title = "Not found",
            Detail = result.ErrorMessage,
            Status = StatusCodes.Status404NotFound
        }),
        ServiceError.NotAllowed => BadRequest(new ProblemDetails
        {
            Title = "Not allowed",
            Detail = result.ErrorMessage,
            Status = StatusCodes.Status400BadRequest
        }),
        _ => BadRequest(new ProblemDetails
        {
            Title = "Invalid reference",
            Detail = result.ErrorMessage,
            Status = StatusCodes.Status400BadRequest
        })
    };

    protected static ModelStateDictionary BuildModelState(ValidationResult validation)
    {
        var modelState = new ModelStateDictionary();
        foreach (var error in validation.Errors)
        {
            modelState.AddModelError(error.PropertyName, error.ErrorMessage);
        }
        return modelState;
    }
}
