using FluentValidation;
using MedApp.Services.DTOs.Auth;

namespace MedApp.Services.Validation;

public class ForgotPasswordRequestValidator : AbstractValidator<ForgotPasswordRequest>
{
    public ForgotPasswordRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty()
            .EmailAddress()
            .MaximumLength(75);
    }
}
