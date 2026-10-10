using MedApp.Models.Models.Enums;

namespace MedApp.Services.DTOs.Users;

// Body of PUT /api/users/{id}/role (admins only).
public class UpdateRoleRequest
{
    public UserRole Role { get; set; }
}
