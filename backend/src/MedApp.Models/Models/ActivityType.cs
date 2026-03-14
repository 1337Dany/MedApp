namespace MedApp.Models.Models;

public class ActivityType
{
    public int TypeId { get; set; }
    public string TypeName { get; set; } = null!;

    public ICollection<Activity> Activities { get; set; } = new List<Activity>();
}