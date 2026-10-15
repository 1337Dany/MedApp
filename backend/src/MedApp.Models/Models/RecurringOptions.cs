using MedApp.Models.Models.Enums;

namespace MedApp.Models.Models;

public class RecurringOptions
{
    public Guid RecurringOptionsId { get; set; }

    public Frequency Frequency { get; set; }

    // Last day (inclusive) of the series; null repeats indefinitely.
    public DateOnly? Until { get; set; }

    public ICollection<OptionsDayOfWeek> DaysOfWeek { get; set; }
        = new List<OptionsDayOfWeek>();

    public ICollection<Activity> Activities { get; set; }
        = new List<Activity>();
}