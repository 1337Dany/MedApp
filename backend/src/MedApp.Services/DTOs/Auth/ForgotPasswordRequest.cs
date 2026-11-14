namespace MedApp.Services.DTOs.Auth;

// Body of POST /api/auth/forgot-password.
public class ForgotPasswordRequest
{
    public string Email { get; set; } = null!;
}
