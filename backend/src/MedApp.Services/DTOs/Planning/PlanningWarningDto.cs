using MedApp.Services.Planning;

namespace MedApp.Services.DTOs.Planning;

public class PlanningWarningDto
{
    public DateOnly Date { get; set; }
    public WarningSeverity Severity { get; set; }
    public string Message { get; set; } = null!;
    public List<string> Suggestions { get; set; } = new();
}
