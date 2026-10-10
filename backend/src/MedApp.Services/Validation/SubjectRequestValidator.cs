using FluentValidation;
using MedApp.Services.DTOs.Subjects;
using MedApp.Services.Repositories;

namespace MedApp.Services.Validation;

public class SubjectRequestValidator : AbstractValidator<SubjectRequest>
{
    public SubjectRequestValidator(IStudyStrategyRepository strategies)
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(50);

        RuleFor(x => x.PlanningMethodId)
            .MustAsync((id, ct) => strategies.ExistsAsync(id, ct))
            .WithMessage("Planning method does not exist.");

        RuleFor(x => x.Priority)
            .InclusiveBetween(1, 10);

        RuleFor(x => x.StudyMode)
            .IsInEnum();

        RuleFor(x => x.ColorHex)
            .NotEmpty()
            .Matches("^#[0-9a-fA-F]{6}$").WithMessage("Color must be a hex value like #3b82f6.");
    }
}
