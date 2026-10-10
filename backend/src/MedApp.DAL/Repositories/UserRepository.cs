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

    public Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);

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
}
