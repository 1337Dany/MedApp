namespace MedApp.Services.Planning;

// Conversions between stored UTC times and the student's wall-clock time.
public static class TimeZones
{
    public static TimeZoneInfo? Find(string? id)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return null;
        }

        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(id);
        }
        catch (Exception e) when (e is TimeZoneNotFoundException or InvalidTimeZoneException)
        {
            return null;
        }
    }

    public static DateTime ToLocal(DateTime utc, TimeZoneInfo zone) =>
        DateTime.SpecifyKind(TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), zone),
            DateTimeKind.Unspecified);

    public static DateTime ToUtc(DateTime local, TimeZoneInfo zone)
    {
        local = DateTime.SpecifyKind(local, DateTimeKind.Unspecified);
        // A wall-clock time skipped by a DST change does not exist; use the hour after.
        if (zone.IsInvalidTime(local))
        {
            local = local.AddHours(1);
        }
        return TimeZoneInfo.ConvertTimeToUtc(local, zone);
    }
}
