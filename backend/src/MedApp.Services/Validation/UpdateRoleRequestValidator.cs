using FluentValidation;
using MedApp.Services.DTOs.Users;

namespace MedApp.Services.Validation;

public class UpdateRoleRequestValidator : AbstractValidator<UpdateRoleRequest>
{
    public UpdateRoleRequestValidator()
    {
        RuleFor(x => x.Role)
            .IsInEnum();
    }
}
