namespace MedApp.Services.DTOs.History;

// Query of GET /api/occurrences: the occurrences that start in [From, To) (UTC).
public class OccurrencesQuery
{
    public DateTime From { get; set; }
    public DateTime To { get; set; }

    // IANA zone of the browser; recurring activities repeat in local time. Remembered for the user.
    public string? TimeZone { get; set; }
}
