using MedApp.Models.Models.Enums;

namespace MedApp.Services.DTOs.Users;

public class UserDto
{
    public Guid Id { get; set; }
    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public DateOnly DateOfBirth { get; set; }
    public string Email { get; set; } = null!;
    public bool DataPermission { get; set; }
    public UserRole Role { get; set; }
}
