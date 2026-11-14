using FluentValidation;
using MedApp.Services.DTOs.Auth;

namespace MedApp.Services.Validation;

public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.FirstName)
            .NotEmpty()
            .MaximumLength(50);

        RuleFor(x => x.LastName)
            .NotEmpty()
            .MaximumLength(50);

        RuleFor(x => x.Email)
            .NotEmpty()
            .EmailAddress()
            .MaximumLength(75);

        RuleFor(x => x.Password)
            .NewPassword();

        RuleFor(x => x.DateOfBirth)
            .Must(dob => dob <= DateOnly.FromDateTime(DateTime.UtcNow))
            .WithMessage("Date of birth cannot be in the future.")
            .Must(dob => dob >= new DateOnly(1900, 1, 1))
            .WithMessage("Date of birth is not valid.");
    }
}
