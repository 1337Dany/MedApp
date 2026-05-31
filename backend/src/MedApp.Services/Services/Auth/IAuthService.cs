using MedApp.Services.DTOs.Auth;

namespace MedApp.Services.Services.Auth;

public interface IAuthService
{
    Task<AuthResult> RegisterAsync(RegisterRequest request, CancellationToken ct = default);

    Task<AuthResult> LoginAsync(LoginRequest request, CancellationToken ct = default);

    Task<AuthResult> RefreshAsync(RefreshRequest request, CancellationToken ct = default);

    Task<bool> LogoutAsync(LogoutRequest request, CancellationToken ct = default);
}
