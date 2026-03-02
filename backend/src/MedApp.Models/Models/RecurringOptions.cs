using MedApp.Models.Models.Enums;

namespace MedApp.Models.Models;

public class RecurringOptions
{
    public Guid RecurringOptionsId { get; set; }

    public Frequency Frequency { get; set; }

    public ICollection<DayOfWeekEnum> DaysOfWeek { get; set; }
        = new List<DayOfWeekEnum>();

    public ICollection<Activity> Activities { get; set; }
        = new List<Activity>();
}