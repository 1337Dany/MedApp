using MedApp.Models.Models.Enums;

namespace MedApp.Models.Models;

public class Subject
{
    public Guid SubjectId { get; set; }

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string Name { get; set; } = null!;
    public DateOnly ExamDate { get; set; }

    public int PlanningMethodId { get; set; }
    public StudyStrategy PlanningMethod { get; set; } = null!;

    public int Priority { get; set; }
    public StudyMode StudyMode { get; set; }

    public string ColorHex { get; set; } = null!;

    public ICollection<Topic> Topics { get; set; } = new List<Topic>();
    public ICollection<Activity> Activities { get; set; } = new List<Activity>();
}