namespace MedApp.Services.DTOs.Lookups;

// Row of a seeded lookup table (study strategies, activity types).
public class LookupDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
}
