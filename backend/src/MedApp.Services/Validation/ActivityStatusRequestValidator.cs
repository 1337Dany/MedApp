using FluentValidation;
using MedApp.Services.DTOs.Activities;

namespace MedApp.Services.Validation;

public class ActivityStatusRequestValidator : AbstractValidator<ActivityStatusRequest>
{
    public ActivityStatusRequestValidator()
    {
        RuleFor(x => x.Status)
            .IsInEnum();
    }
}
