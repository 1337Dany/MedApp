namespace MedApp.Models.Models.Enums;

public enum UserRole
{
    // Students. Kept as "User" because Role is stored as an integer and already used in tokens.
    User = 0,
    Admin = 1,
    Teacher = 2
}
