using MedApp.Models.Models.Enums;

namespace MedApp.Services.DTOs.Subjects;

public class SubjectDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public DateOnly? ExamDate { get; set; }
    public int PlanningMethodId { get; set; }
    public int Priority { get; set; }
    public StudyMode StudyMode { get; set; }
    public string ColorHex { get; set; } = null!;
}
