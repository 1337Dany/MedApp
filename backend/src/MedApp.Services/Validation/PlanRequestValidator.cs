using FluentValidation;
using MedApp.Services.DTOs.Planning;
using MedApp.Services.Planning;

namespace MedApp.Services.Validation;

public class PlanRequestValidator : AbstractValidator<PlanRequest>
{
    public PlanRequestValidator()
    {
        RuleFor(x => x.Days)
            .InclusiveBetween(1, PlanningRules.MaxHorizonDays)
            .When(x => x.Days is not null);

        RuleFor(x => x.TimeZone)
            .MaximumLength(64);
    }
}
