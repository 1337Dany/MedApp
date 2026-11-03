using FluentValidation;
using MedApp.Services.DTOs.Onboarding;

namespace MedApp.Services.Validation;

public class DemoDataRequestValidator : AbstractValidator<DemoDataRequest>
{
    public DemoDataRequestValidator()
    {
        RuleFor(x => x.TimeZone).MaximumLength(64);
    }
}
