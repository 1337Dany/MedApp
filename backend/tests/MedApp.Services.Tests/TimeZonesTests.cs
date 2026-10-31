using MedApp.Services.Planning;

namespace MedApp.Services.Tests;

public class TimeZonesTests
{
    private static readonly TimeZoneInfo Warsaw = TimeZoneInfo.FindSystemTimeZoneById("Europe/Warsaw");

    [Fact]
    public void An_ambiguous_time_is_its_first_pass_like_in_browsers()
    {
        // 31 Oct 2027, 02:30 happens twice in Warsaw: at +02:00 and then at +01:00.
        var utc = TimeZones.ToUtc(new DateTime(2027, 10, 31, 2, 30, 0), Warsaw);

        Assert.Equal(new DateTime(2027, 10, 31, 0, 30, 0, DateTimeKind.Utc), utc);
        Assert.Equal(DateTimeKind.Utc, utc.Kind);
    }

    [Fact]
    public void An_ambiguous_time_converts_back_to_the_same_wall_clock()
    {
        var local = new DateTime(2027, 10, 31, 2, 30, 0);

        Assert.Equal(local, TimeZones.ToLocal(TimeZones.ToUtc(local, Warsaw), Warsaw));
    }

    [Fact]
    public void A_skipped_time_is_the_hour_after()
    {
        Assert.Equal(new DateTime(2027, 3, 28, 1, 30, 0, DateTimeKind.Utc),
            TimeZones.ToUtc(new DateTime(2027, 3, 28, 2, 30, 0), Warsaw));
    }

    [Fact]
    public void An_ordinary_time_uses_its_offset()
    {
        Assert.Equal(new DateTime(2027, 7, 1, 10, 0, 0, DateTimeKind.Utc),
            TimeZones.ToUtc(new DateTime(2027, 7, 1, 12, 0, 0), Warsaw));
    }
}
