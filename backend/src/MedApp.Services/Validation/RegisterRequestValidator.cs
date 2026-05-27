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
            .NotEmpty()
            .MinimumLength(8)
            .MaximumLength(128)
            .Matches("[A-Z]").WithMessage("Password must contain at least one uppercase letter.")
            .Matches("[a-z]").WithMessage("Password must contain at least one lowercase letter.")
            .Matches("[0-9]").WithMessage("Password must contain at least one digit.");

        RuleFor(x => x.DateOfBirth)
            .Must(dob => dob <= DateOnly.FromDateTime(DateTime.UtcNow))
            .WithMessage("Date of birth cannot be in the future.")
            .Must(dob => dob >= new DateOnly(1900, 1, 1))
            .WithMessage("Date of birth is not valid.");
    }
}
