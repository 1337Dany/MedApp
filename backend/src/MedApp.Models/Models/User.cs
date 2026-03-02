namespace MedApp.Models.Models;

public class User
{
    public Guid Id { get; set; }

    public string FirstName { get; set; } = null!;
    public string LastName { get; set; } = null!;
    public DateOnly DateOfBirth { get; set; }

    public string Email { get; set; } = null!;
    public string HashedPassword { get; set; } = null!;
    public bool DataPermission { get; set; }

    public ICollection<Subject> Subjects { get; set; } = new List<Subject>();
}