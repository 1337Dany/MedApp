namespace MedApp.Services.DTOs.Users;

// Body of PUT /api/users/me.
public class UpdateProfileRequest
{
    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public DateOnly DateOfBirth { get; set; }

    // Consent to include the student's data, anonymized and aggregated, in teacher analytics.
    public bool DataPermission { get; set; }
}
