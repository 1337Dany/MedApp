using FluentValidation;
using MedApp.Models.Models.Enums;
using MedApp.Services.DTOs.Activities;
using MedApp.Services.Repositories;

namespace MedApp.Services.Validation;

public class ActivityRequestValidator : AbstractValidator<ActivityRequest>
{
    public ActivityRequestValidator(IActivityTypeRepository activityTypes)
    {
        RuleFor(x => x.Title)
            .NotEmpty()
            .MaximumLength(100);

        RuleFor(x => x.ActivityTypeId)
            .MustAsync((id, ct) => activityTypes.ExistsAsync(id, ct))
            .WithMessage("Activity type does not exist.");

        RuleFor(x => x.Priority)
            .InclusiveBetween(1, 5);

        RuleFor(x => x.StartTime)
            .NotEqual(default(DateTime)).WithMessage("Start time is required.");

        RuleFor(x => x.DurationMinutes)
            .InclusiveBetween(1, 24 * 60);

        RuleFor(x => x.Notes)
            .MaximumLength(500);

        RuleFor(x => x.Status)
            .IsInEnum();

        RuleFor(x => x.Recurrence)
            .NotNull().WithMessage("Recurrence is required for a recurring activity.")
            .When(x => x.IsRecurring);

        When(x => x.IsRecurring && x.Recurrence is not null, () =>
        {
            RuleFor(x => x.Recurrence!.Frequency)
                .IsInEnum();

            RuleFor(x => x.Recurrence!.DaysOfWeek)
                .NotEmpty().WithMessage("Pick at least one day for a weekly activity.")
                .When(x => x.Recurrence!.Frequency == Frequency.Weekly);

            RuleForEach(x => x.Recurrence!.DaysOfWeek)
                .IsInEnum();

            RuleFor(x => x.Recurrence!.Until)
                .Must((request, until) => until is null || until >= DateOnly.FromDateTime(request.StartTime))
                .WithMessage("The series cannot end before it starts.");
        });
    }
}
