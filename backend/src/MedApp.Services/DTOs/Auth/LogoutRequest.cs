namespace MedApp.Services.DTOs.Auth;

public class LogoutRequest
{
    public string RefreshToken { get; set; } = null!;
}
