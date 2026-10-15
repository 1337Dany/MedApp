using FluentValidation;
using MedApp.Services.DTOs.Topics;

namespace MedApp.Services.Validation;

public class TopicRequestValidator : AbstractValidator<TopicRequest>
{
    public TopicRequestValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty()
            .MaximumLength(100);

        RuleFor(x => x.Notes)
            .MaximumLength(1000);

        RuleFor(x => x.Feedback)
            .IsInEnum();

        RuleFor(x => x.Order)
            .GreaterThanOrEqualTo(0)
            .When(x => x.Order is not null);
    }
}
