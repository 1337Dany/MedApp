using FluentValidation;
using MedApp.Services.DTOs.Auth;

namespace MedApp.Services.Validation;

public class ResetPasswordRequestValidator : AbstractValidator<ResetPasswordRequest>
{
    public ResetPasswordRequestValidator()
    {
        RuleFor(x => x.Token)
            .NotEmpty()
            .MaximumLength(256);

        RuleFor(x => x.NewPassword)
            .NewPassword();
    }
}
