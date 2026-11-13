using AutoMapper;
using MedApp.Models.Models;
using MedApp.Services.DTOs.Auth;
using MedApp.Services.DTOs.Users;
using MedApp.Services.Repositories;
using MedApp.Services.Services.Email;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace MedApp.Services.Services.Auth;

public class AuthService : IAuthService
{
    private readonly IUserRepository _users;
    private readonly IRefreshTokenRepository _refreshTokens;
    private readonly IUnitOfWork _uow;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly IJwtTokenService _tokenService;
    private readonly IMapper _mapper;
    private readonly IEmailSender _emailSender;
    private readonly EmailOptions _email;
    private readonly ILogger<AuthService> _logger;

    // Verified when the email is unknown, so that answer takes as long as a wrong password (no account probing).
    private static readonly User UnknownUser = new();
    private static readonly string UnknownUserHash = new PasswordHasher<User>().HashPassword(UnknownUser, Guid.NewGuid().ToString());

    public AuthService(
        IUserRepository users,
        IRefreshTokenRepository refreshTokens,
        IUnitOfWork uow,
        IPasswordHasher<User> passwordHasher,
        IJwtTokenService tokenService,
        IMapper mapper,
        IEmailSender emailSender,
        IOptions<EmailOptions> email,
        ILogger<AuthService> logger)
    {
        _emailSender = emailSender;
        _email = email.Value;
        _logger = logger;
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
        try
        {
            await _uow.SaveChangesAsync(ct);
        }
        catch (UniqueConstraintException)
        {
            // Another registration of the same email got in between the check above and this save.
            return AuthResult.Failure(AuthError.EmailAlreadyTaken, "Email is already in use.");
        }

        var tokens = await IssueTokensAsync(user, ct);
        return AuthResult.Success(tokens);
    }

    public async Task<AuthResult> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var user = await _users.GetByEmailAsync(normalizedEmail, ct);
        if (user is null)
        {
            _passwordHasher.VerifyHashedPassword(UnknownUser, UnknownUserHash, request.Password);
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
            Id = Guid.NewGuid(),
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

    public async Task<bool> LogoutAsync(LogoutRequest request, Guid userId, CancellationToken ct = default)
    {
        var hash = _tokenService.HashRefreshToken(request.RefreshToken);

        var token = await _refreshTokens.GetByTokenHashAsync(hash, ct);

        // A caller may only revoke their own refresh token.
        if (token is null || token.UserId != userId || token.RevokedAt is not null)
        {
            return false;
        }

        token.RevokedAt = DateTime.UtcNow;
        await _uow.SaveChangesAsync(ct);
        return true;
    }

    public async Task<AuthResult> ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(userId, ct);
        if (user is null ||
            _passwordHasher.VerifyHashedPassword(user, user.HashedPassword, request.CurrentPassword) == PasswordVerificationResult.Failed)
        {
            return AuthResult.Failure(AuthError.InvalidCredentials, "The current password is not correct.");
        }

        // The new hash, the end of every other session and this session's new tokens are saved together.
        await using var transaction = await _uow.BeginTransactionAsync(ct);
        user.HashedPassword = _passwordHasher.HashPassword(user, request.NewPassword);
        user.PasswordResetTokenHash = null;
        user.PasswordResetExpiresAt = null;
        await _refreshTokens.RevokeAllActiveForUserAsync(userId, ct);
        var tokens = await IssueTokensAsync(user, ct);
        await transaction.CommitAsync(ct);
        return AuthResult.Success(tokens);
    }

    public async Task RequestPasswordResetAsync(ForgotPasswordRequest request, string requestOrigin, CancellationToken ct = default)
    {
        var user = await _users.GetByEmailAsync(request.Email.Trim().ToLowerInvariant(), ct);
        if (user is null)
        {
            // The caller is not told: the answer is the same for every address.
            return;
        }

        // An opaque random token like a refresh token; only its hash is stored, and a new mail replaces the old one.
        var (token, hash, _) = _tokenService.GenerateRefreshToken();
        user.PasswordResetTokenHash = hash;
        user.PasswordResetExpiresAt = DateTime.UtcNow.AddMinutes(_email.PasswordResetMinutes);
        await _uow.SaveChangesAsync(ct);

        var baseUrl = (string.IsNullOrWhiteSpace(_email.PublicUrl) ? requestOrigin : _email.PublicUrl).TrimEnd('/');
        var link = $"{baseUrl}/?resetToken={Uri.EscapeDataString(token)}";
        try
        {
            await _emailSender.SendAsync(
                user.Email,
                "Reset your MedStudy Planner password",
                $"Hello {user.FirstName},\n\n" +
                $"open this link to choose a new password (valid for {_email.PasswordResetMinutes} minutes):\n{link}\n\n" +
                "If you did not ask for it, ignore this mail: your password stays as it is.",
                ct);
        }
        catch (Exception e) when (e is not OperationCanceledException)
        {
            // A mail server problem must not tell the caller that the address exists.
            _logger.LogError(e, "Could not send the password reset mail.");
        }
    }

    public async Task<bool> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken ct = default)
    {
        var user = await _users.GetByPasswordResetTokenHashAsync(_tokenService.HashRefreshToken(request.Token), ct);
        if (user is null || user.PasswordResetExpiresAt is null || user.PasswordResetExpiresAt < DateTime.UtcNow)
        {
            return false;
        }

        // The token works once, and whoever knew the old password is signed out everywhere.
        await using var transaction = await _uow.BeginTransactionAsync(ct);
        user.HashedPassword = _passwordHasher.HashPassword(user, request.NewPassword);
        user.PasswordResetTokenHash = null;
        user.PasswordResetExpiresAt = null;
        await _refreshTokens.RevokeAllActiveForUserAsync(user.Id, ct);
        await _uow.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return true;
    }

    public async Task<UserDto?> GetUserAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(userId, ct);
        return user is null ? null : _mapper.Map<UserDto>(user);
    }

    private async Task<TokenResponse> IssueTokensAsync(User user, CancellationToken ct)
    {
        var (accessToken, accessExpiresAt) = _tokenService.GenerateAccessToken(user);
        var (rawRefresh, hashRefresh, refreshExpiresAt) = _tokenService.GenerateRefreshToken();

        // Signing in is where the user's dead tokens are cleared out, or the table only ever grows.
        await _refreshTokens.DeleteExpiredForUserAsync(user.Id, ct);

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
