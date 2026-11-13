namespace MedApp.Services.Repositories;

// A save hit a unique index (e.g. two registrations of the same email at the same moment).
public class UniqueConstraintException : Exception
{
    public UniqueConstraintException(Exception inner)
        : base("A row with the same unique value already exists.", inner)
    {
    }
}
