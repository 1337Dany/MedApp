namespace MedApp.Services.DTOs.Onboarding;

// Body of POST /api/onboarding/demo-data. The schedule is placed in this IANA zone; an unknown one falls back to the
// stored zone, then UTC.
public class DemoDataRequest
{
    public string? TimeZone { get; set; }
}
