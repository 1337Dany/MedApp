using AutoMapper;
using MedApp.Models.Models;
using MedApp.Services.DTOs.Auth;
using MedApp.Services.Repositories;
using Microsoft.AspNetCore.Identity;

namespace MedApp.Services.Services.Auth;

public class AuthService : IAuthService
{
    private readonly IUserRepository _users;
    private readonly IRefreshTokenRepository _refreshTokens;
    private readonly IUnitOfWork _uow;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly IJwtTokenService _tokenService;
    private readonly IMapper _mapper;

    public AuthService(
        IUserRepository users,
        IRefreshTokenRepository refreshTokens,
        IUnitOfWork uow,
        IPasswordHasher<User> passwordHasher,
        IJwtTokenService tokenService,
        IMapper mapper)
    {
        _users = users;
        _refreshTokens = refreshTokens;
        _uow = uow;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _mapper = mapper;
    }

    public async Task<AuthResult> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        if (await _users.EmailExistsAsync(normalizedEmail, ct))
        {
            return AuthResult.Failure(AuthError.EmailAlreadyTaken, "Email is already in use.");
        }

        var user = _mapper.Map<User>(request);
        user.Email = normalizedEmail;
        user.HashedPassword = _passwordHasher.HashPassword(user, request.Password);

        await _users.AddAsync(user, ct);
        // Commit the new user first so the server-generated Id is populated before we
        // create a refresh token that references it.
        await _uow.SaveChangesAsync(ct);

        var tokens = await IssueTokensAsync(user, ct);
        return AuthResult.Success(tokens);
    }

    public async Task<AuthResult> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var user = await _users.GetByEmailAsync(normalizedEmail, ct);
        if (user is null)
        {
            return AuthResult.Failure(AuthError.InvalidCredentials, "Invalid email or password.");
        }

        var verification = _passwordHasher.VerifyHashedPassword(user, user.HashedPassword, request.Password);

        if (verification == PasswordVerificationResult.Failed)
        {
            return AuthResult.Failure(AuthError.InvalidCredentials, "Invalid email or password.");
        }

        if (verification == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.HashedPassword = _passwordHasher.HashPassword(user, request.Password);
            // The rehash is persisted together with the new refresh token below.
        }

        var tokens = await IssueTokensAsync(user, ct);
        return AuthResult.Success(tokens);
    }

    public async Task<AuthResult> RefreshAsync(RefreshRequest request, CancellationToken ct = default)
    {
        var hash = _tokenService.HashRefreshToken(request.RefreshToken);

        var existing = await _refreshTokens.GetByTokenHashAsync(hash, ct);

        if (existing is null || !existing.IsActive)
        {
            // Replay of an already-revoked token: revoke the whole active chain for this user.
            if (existing is { RevokedAt: not null })
            {
                await _refreshTokens.RevokeAllActiveForUserAsync(existing.UserId, ct);
            }
            return AuthResult.Failure(AuthError.InvalidRefreshToken, "Invalid or expired refresh token.");
        }

        var (rawNew, hashNew, refreshExpiresAt) = _tokenService.GenerateRefreshToken();

        var newToken = new RefreshToken
        {
            UserId = existing.UserId,
            TokenHash = hashNew,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = refreshExpiresAt
        };
        await _refreshTokens.AddAsync(newToken, ct);

        existing.RevokedAt = DateTime.UtcNow;
        existing.ReplacedByTokenId = newToken.Id;

        var (accessToken, accessExpiresAt) = _tokenService.GenerateAccessToken(existing.User);

        await _uow.SaveChangesAsync(ct);

        return AuthResult.Success(new TokenResponse
        {
            AccessToken = accessToken,
            AccessTokenExpiresAt = accessExpiresAt,
            RefreshToken = rawNew,
            RefreshTokenExpiresAt = refreshExpiresAt
        });
    }

    public async Task<bool> LogoutAsync(LogoutRequest request, CancellationToken ct = default)
    {
        var hash = _tokenService.HashRefreshToken(request.RefreshToken);

        var token = await _refreshTokens.GetByTokenHashAsync(hash, ct);

        if (token is null || token.RevokedAt is not null)
        {
            return false;
        }

        token.RevokedAt = DateTime.UtcNow;
        await _uow.SaveChangesAsync(ct);
        return true;
    }

    private async Task<TokenResponse> IssueTokensAsync(User user, CancellationToken ct)
    {
        var (accessToken, accessExpiresAt) = _tokenService.GenerateAccessToken(user);
        var (rawRefresh, hashRefresh, refreshExpiresAt) = _tokenService.GenerateRefreshToken();

        await _refreshTokens.AddAsync(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = hashRefresh,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = refreshExpiresAt
        }, ct);

        await _uow.SaveChangesAsync(ct);

        return new TokenResponse
        {
            AccessToken = accessToken,
            AccessTokenExpiresAt = accessExpiresAt,
            RefreshToken = rawRefresh,
            RefreshTokenExpiresAt = refreshExpiresAt
        };
    }
}
