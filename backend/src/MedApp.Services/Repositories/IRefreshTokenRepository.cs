using MedApp.Models.Models;

namespace MedApp.Services.Repositories;

public interface IRefreshTokenRepository
{
    /// <summary>
    /// Looks up a refresh token by its hash, with the owning <see cref="User"/> eagerly loaded.
    /// </summary>
    Task<RefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken ct = default);

    Task AddAsync(RefreshToken token, CancellationToken ct = default);

    /// <summary>
    /// Bulk-revokes every refresh token for the given user that is not yet revoked.
    /// Bypasses the change tracker (single UPDATE) and does not require a unit-of-work commit.
    /// </summary>
    Task<int> RevokeAllActiveForUserAsync(Guid userId, CancellationToken ct = default);

    /// <summary>
    /// Deletes the user's refresh tokens that have expired (single DELETE, no unit-of-work commit). Revoked tokens
    /// stay until they expire: replay detection needs them.
    /// </summary>
    Task<int> DeleteExpiredForUserAsync(Guid userId, CancellationToken ct = default);
}
