namespace MedApp.Services.DTOs.Auth;

// Body of POST /api/auth/change-password.
public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = null!;
    public string NewPassword { get; set; } = null!;
}
