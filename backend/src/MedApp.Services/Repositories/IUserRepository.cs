using MedApp.Models.Models;

namespace MedApp.Services.Repositories;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default);

    Task<User?> GetByEmailAsync(string normalizedEmail, CancellationToken ct = default);

    Task<bool> EmailExistsAsync(string normalizedEmail, CancellationToken ct = default);

    Task<IEnumerable<User>> GetAllAsync(CancellationToken ct = default);

    /// <summary>Students (role User) who allowed their data to be used in teacher analytics.</summary>
    Task<List<Guid>> GetConsentingStudentIdsAsync(CancellationToken ct = default);

    Task AddAsync(User user, CancellationToken ct = default);

    Task<User?> GetByPasswordResetTokenHashAsync(string tokenHash, CancellationToken ct = default);

    Task<int> CountAdminsAsync(CancellationToken ct = default);

    /// <summary>
    /// Deletes the user and everything they own (subjects, topics, activities with their recurrence, history,
    /// refresh tokens), right away (not on SaveChanges).
    /// </summary>
    Task DeleteWithDataAsync(Guid userId, CancellationToken ct = default);
}
