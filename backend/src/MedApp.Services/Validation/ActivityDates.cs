namespace MedApp.Services.Validation;

// The dates the timetable accepts. A series expands day by day from its start, so a start far in the past would
// record hundreds of thousands of rows, and dates next to DateTime's limits overflow the local-time conversions.
public static class ActivityDates
{
    public static readonly DateTime MinUtc = new(2000, 1, 1, 0, 0, 0, DateTimeKind.Utc);

    public static DateTime MaxUtc => DateTime.UtcNow.AddYears(10);

    public static readonly string RangeMessage = $"The date must be between {MinUtc:yyyy-MM-dd} and 10 years from now.";

    public static bool IsInRange(DateTime value)
    {
        // A value without an offset is taken as UTC, like when it is stored.
        var utc = value.Kind == DateTimeKind.Local ? value.ToUniversalTime() : value;
        return utc >= MinUtc && utc <= MaxUtc;
    }

    public static bool IsInRange(DateOnly value) =>
        value >= DateOnly.FromDateTime(MinUtc) && value <= DateOnly.FromDateTime(MaxUtc);
}
