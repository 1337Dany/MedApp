using FluentValidation;
using MedApp.Services.DTOs.Users;

namespace MedApp.Services.Validation;

public class DeleteAccountRequestValidator : AbstractValidator<DeleteAccountRequest>
{
    public DeleteAccountRequestValidator()
    {
        RuleFor(x => x.Password)
            .NotEmpty();
    }
}
