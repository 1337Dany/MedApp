using MedApp.Models.Models;

namespace MedApp.Services.Services.Auth;

public interface IJwtTokenService
{
    (string Token, DateTime ExpiresAt) GenerateAccessToken(User user);

    (string Token, string TokenHash, DateTime ExpiresAt) GenerateRefreshToken();

    string HashRefreshToken(string rawToken);
}
