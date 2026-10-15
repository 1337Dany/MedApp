using MedApp.Models.Models.Enums;

namespace MedApp.Services.DTOs.Subjects;

// Body of POST /api/subjects and PUT /api/subjects/{id}. The owner comes from the token.
public class SubjectRequest
{
    public string Name { get; set; } = null!;
    public DateOnly? ExamDate { get; set; }
    public int PlanningMethodId { get; set; }
    public int Priority { get; set; }
    public StudyMode StudyMode { get; set; }
    public string ColorHex { get; set; } = null!;
}
