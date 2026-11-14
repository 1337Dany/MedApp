using MedApp.Services.DTOs.Auth;
using MedApp.Services.DTOs.Users;

namespace MedApp.Services.Services.Auth;

public interface IAuthService
{
    Task<AuthResult> RegisterAsync(RegisterRequest request, CancellationToken ct = default);

    Task<AuthResult> LoginAsync(LoginRequest request, CancellationToken ct = default);

    Task<AuthResult> RefreshAsync(RefreshRequest request, CancellationToken ct = default);

    Task<bool> LogoutAsync(LogoutRequest request, Guid userId, CancellationToken ct = default);

    // Checks the current password, signs every other session out and returns new tokens for this one.
    Task<AuthResult> ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken ct = default);

    // Mails a single-use reset link when the address belongs to an account; says nothing either way. requestOrigin
    // (scheme and host of the request) is only used for the link when Email:PublicUrl is not configured.
    Task RequestPasswordResetAsync(ForgotPasswordRequest request, string requestOrigin, CancellationToken ct = default);

    // Sets the password with the token from the reset mail and ends every session; false for an unknown, used or
    // expired token.
    Task<bool> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct = default);

    Task<UserDto?> GetUserAsync(Guid userId, CancellationToken ct = default);
}
