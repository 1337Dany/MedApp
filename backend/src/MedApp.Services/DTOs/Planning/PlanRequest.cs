namespace MedApp.Services.DTOs.Planning;

// Body of POST /api/planning/generate.
public class PlanRequest
{
    // IANA id from the browser (e.g. "Europe/Warsaw"); remembered for automatic re-planning.
    public string? TimeZone { get; set; }

    // Horizon in days, starting today (default 7, max 28).
    public int? Days { get; set; }
}
