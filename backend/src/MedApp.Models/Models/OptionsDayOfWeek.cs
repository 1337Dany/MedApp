using MedApp.Models.Models.Enums;

namespace MedApp.Models.Models;

public class OptionsDayOfWeek
{
    public Guid RecurringOptionsId { get; set; }
    public RecurringOptions RecurringOptions { get; set; } = null!;

    public DayOfWeekEnum DayOfWeek { get; set; }
}