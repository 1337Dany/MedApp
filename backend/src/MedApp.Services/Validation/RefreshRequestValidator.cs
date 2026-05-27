using FluentValidation;
using MedApp.Services.DTOs.Auth;

namespace MedApp.Services.Validation;

public class RefreshRequestValidator : AbstractValidator<RefreshRequest>
{
    public RefreshRequestValidator()
    {
        RuleFor(x => x.RefreshToken)
            .NotEmpty();
    }
}
