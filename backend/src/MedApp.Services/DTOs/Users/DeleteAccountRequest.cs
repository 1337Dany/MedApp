namespace MedApp.Services.DTOs.Users;

// Body of DELETE /api/users/me: the password confirms that the owner asks.
public class DeleteAccountRequest
{
    public string Password { get; set; } = null!;
}
