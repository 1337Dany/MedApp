using MedApp.Services.DTOs.Subjects;

namespace MedApp.Services.Services;

// Every method is scoped to the caller (userId from the token). Null / false means "not found or not yours".
public interface ISubjectService
{
    Task<IEnumerable<SubjectDto>> GetAllAsync(Guid userId, CancellationToken ct = default);
    Task<SubjectDto?> GetByIdAsync(Guid subjectId, Guid userId, CancellationToken ct = default);
    Task<SubjectDto> CreateAsync(Guid userId, SubjectRequest request, CancellationToken ct = default);
    Task<SubjectDto?> UpdateAsync(Guid subjectId, Guid userId, SubjectRequest request, CancellationToken ct = default);
    Task<bool> DeleteAsync(Guid subjectId, Guid userId, CancellationToken ct = default);
}
