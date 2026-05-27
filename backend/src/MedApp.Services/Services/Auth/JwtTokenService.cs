using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using MedApp.Models.Models;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace MedApp.Services.Services.Auth;

public class JwtTokenService : IJwtTokenService
{
    private readonly JwtOptions _options;
    private readonly JwtSecurityTokenHandler _handler = new();

    public JwtTokenService(IOptions<JwtOptions> options)
    {
        _options = options.Value;
    }

    public (string Token, DateTime ExpiresAt) GenerateAccessToken(User user)
    {
        var now = DateTime.UtcNow;
        var expiresAt = now.AddMinutes(_options.AccessTokenMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.GivenName, user.FirstName),
            new(JwtRegisteredClaimNames.FamilyName, user.LastName),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Role, user.Role.ToString())
        };

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Key));
        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var jwt = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            notBefore: now,
            expires: expiresAt,
            signingCredentials: credentials);

        return (_handler.WriteToken(jwt), expiresAt);
    }

    public (string Token, string TokenHash, DateTime ExpiresAt) GenerateRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        var token = Convert.ToBase64String(bytes)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');

        var expiresAt = DateTime.UtcNow.AddDays(_options.RefreshTokenDays);
        return (token, HashRefreshToken(token), expiresAt);
    }

    public string HashRefreshToken(string rawToken)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(rawToken));
        return Convert.ToHexString(hash);
    }
}
