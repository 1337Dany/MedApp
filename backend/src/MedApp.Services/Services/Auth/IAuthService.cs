using MedApp.Services.DTOs.Auth;
using MedApp.Services.DTOs.Users;

namespace MedApp.Services.Services.Auth;

public interface IAuthService
{
    Task<AuthResult> RegisterAsync(RegisterRequest request, CancellationToken ct = default);

    Task<AuthResult> LoginAsync(LoginRequest request, CancellationToken ct = default);

    Task<AuthResult> RefreshAsync(RefreshRequest request, CancellationToken ct = default);

    Task<bool> LogoutAsync(LogoutRequest request, Guid userId, CancellationToken ct = default);

    Task<UserDto?> GetUserAsync(Guid userId, CancellationToken ct = default);
}
