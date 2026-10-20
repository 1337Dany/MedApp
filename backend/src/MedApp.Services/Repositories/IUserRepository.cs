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
}
