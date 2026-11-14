namespace MedApp.Services.DTOs.Auth;

// Body of POST /api/auth/reset-password. The token comes from the link in the reset mail.
public class ResetPasswordRequest
{
    public string Token { get; set; } = null!;
    public string NewPassword { get; set; } = null!;
}
