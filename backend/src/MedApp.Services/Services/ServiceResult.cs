namespace MedApp.Services.Services;

public enum ServiceError
{
    None = 0,
    NotFound,
    InvalidReference,
    NotAllowed
}

// Outcome of a write that can fail for reasons other than validation (missing row, foreign row referenced).
public class ServiceResult<T>
{
    public bool Succeeded { get; private init; }
    public ServiceError Error { get; private init; }
    public string? ErrorMessage { get; private init; }
    public T? Value { get; private init; }

    public static ServiceResult<T> Success(T value) =>
        new() { Succeeded = true, Value = value };

    public static ServiceResult<T> Failure(ServiceError error, string message) =>
        new() { Succeeded = false, Error = error, ErrorMessage = message };
}
