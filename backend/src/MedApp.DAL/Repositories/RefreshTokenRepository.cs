using MedApp.DAL.Context;
using MedApp.Models.Models;
using MedApp.Services.Repositories;
using Microsoft.EntityFrameworkCore;

namespace MedApp.DAL.Repositories;

public class RefreshTokenRepository : IRefreshTokenRepository
{
    private readonly MedAppDbContext _db;

    public RefreshTokenRepository(MedAppDbContext db)
    {
        _db = db;
    }

    public Task<RefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken ct = default) =>
        _db.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.TokenHash == tokenHash, ct);

    public Task AddAsync(RefreshToken token, CancellationToken ct = default)
    {
        _db.RefreshTokens.Add(token);
        return Task.CompletedTask;
    }

    public Task<int> RevokeAllActiveForUserAsync(Guid userId, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        return _db.RefreshTokens
            .Where(rt => rt.UserId == userId && rt.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(rt => rt.RevokedAt, now), ct);
    }
}
