using FluentValidation;
using MedApp.Services.DTOs.History;

namespace MedApp.Services.Validation;

public class OccurrencesQueryValidator : AbstractValidator<OccurrencesQuery>
{
    public const int MaxRangeDays = 400;

    public OccurrencesQueryValidator()
    {
        RuleFor(x => x.From)
            .NotEmpty()
            .Must(ActivityDates.IsInRange).WithMessage(ActivityDates.RangeMessage);

        RuleFor(x => x.To)
            .GreaterThan(x => x.From)
            .WithMessage("'To' must be after 'From'.")
            .Must(ActivityDates.IsInRange).WithMessage(ActivityDates.RangeMessage);

        RuleFor(x => x)
            .Must(x => x.To - x.From <= TimeSpan.FromDays(MaxRangeDays))
            .WithName("To")
            .WithMessage($"The range can be at most {MaxRangeDays} days.");

        // Like the planner, an unknown zone falls back to the stored one.
        RuleFor(x => x.TimeZone)
            .MaximumLength(64);
    }
}
