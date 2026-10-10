using MedApp.Models.Models.Enums;

namespace MedApp.Services.DTOs.Activities;

public class RecurrenceDto
{
    public Frequency Frequency { get; set; }

    // Required for weekly series; ignored for daily ones.
    public List<DayOfWeekEnum> DaysOfWeek { get; set; } = new();

    // Last day (inclusive); null repeats indefinitely.
    public DateOnly? Until { get; set; }
}
