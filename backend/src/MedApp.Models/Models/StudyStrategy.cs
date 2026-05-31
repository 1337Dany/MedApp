namespace MedApp.Models.Models;

public class StudyStrategy
{
    public int MethodId { get; set; }
    public string MethodName { get; set; } = null!;

    public ICollection<Subject> Subjects { get; set; } = new List<Subject>();
}