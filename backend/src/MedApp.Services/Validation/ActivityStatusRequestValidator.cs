using FluentValidation;
using MedApp.Services.DTOs.Activities;

namespace MedApp.Services.Validation;

public class ActivityStatusRequestValidator : AbstractValidator<ActivityStatusRequest>
{
    public ActivityStatusRequestValidator()
    {
        RuleFor(x => x.Status)
            .IsInEnum();

        RuleFor(x => x.OccurrenceStart)
            .Must(start => start is null || ActivityDates.IsInRange(start.Value))
            .WithMessage(ActivityDates.RangeMessage);
    }
}
