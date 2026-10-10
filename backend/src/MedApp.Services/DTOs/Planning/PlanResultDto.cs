using MedApp.Services.DTOs.Activities;

namespace MedApp.Services.DTOs.Planning;

public class PlanResultDto
{
    // The newly planned sessions (previous future auto-planned sessions were replaced).
    public List<ActivityDto> Sessions { get; set; } = new();
    public List<PlanningWarningDto> Warnings { get; set; } = new();
}
