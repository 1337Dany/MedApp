using MedApp.DAL.Context;
using MedApp.Models.Models;
using MedApp.Models.Models.Enums;
using MedApp.Services.Repositories;
using Microsoft.EntityFrameworkCore;

namespace MedApp.DAL.Repositories;

public class UserRepository : IUserRepository
{
    private readonly MedAppDbContext _db;

    public UserRepository(MedAppDbContext db)
    {
        _db = db;
    }

    // FindAsync answers from the change tracker when the request has loaded the user already.
    public async Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        await _db.Users.FindAsync([id], ct);

    public Task<User?> GetByEmailAsync(string normalizedEmail, CancellationToken ct = default) =>
        _db.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail, ct);

    public Task<bool> EmailExistsAsync(string normalizedEmail, CancellationToken ct = default) =>
        _db.Users.AsNoTracking().AnyAsync(u => u.Email == normalizedEmail, ct);

    public async Task<IEnumerable<User>> GetAllAsync(CancellationToken ct = default) =>
        await _db.Users.AsNoTracking().OrderBy(u => u.LastName).ThenBy(u => u.FirstName).ToListAsync(ct);

    public Task<List<Guid>> GetConsentingStudentIdsAsync(CancellationToken ct = default) =>
        _db.Users
            .Where(u => u.Role == UserRole.User && u.DataPermission)
            .Select(u => u.Id)
            .ToListAsync(ct);

    public Task AddAsync(User user, CancellationToken ct = default)
    {
        _db.Users.Add(user);
        return Task.CompletedTask;
    }

    public Task<User?> GetByPasswordResetTokenHashAsync(string tokenHash, CancellationToken ct = default) =>
        _db.Users.FirstOrDefaultAsync(u => u.PasswordResetTokenHash == tokenHash, ct);

    public Task<int> CountAdminsAsync(CancellationToken ct = default) =>
        _db.Users.CountAsync(u => u.Role == UserRole.Admin, ct);

    public async Task DeleteWithDataAsync(Guid userId, CancellationToken ct = default)
    {
        await using var transaction = _db.Database.CurrentTransaction is null
            ? await _db.Database.BeginTransactionAsync(ct)
            : null;

        // Recurrence rows hang on their activities only by a nullable key, so the cascade from the user would
        // leave them behind; everything else goes with the user row (ON DELETE CASCADE).
        await _db.RecurringOptions
            .Where(ro => ro.Activities.Any(a => a.UserId == userId))
            .ExecuteDeleteAsync(ct);
        await _db.Users.Where(u => u.Id == userId).ExecuteDeleteAsync(ct);

        if (transaction is not null)
        {
            await transaction.CommitAsync(ct);
        }
    }
}
