using MedApp.Services.DTOs.Auth;

namespace MedApp.Services.Services.Auth;

public class AuthResult
{
    public bool Succeeded { get; private init; }
    public AuthError Error { get; private init; }
    public string? ErrorMessage { get; private init; }
    public TokenResponse? Tokens { get; private init; }

    public static AuthResult Success(TokenResponse tokens) =>
        new() { Succeeded = true, Tokens = tokens };

    public static AuthResult Failure(AuthError error, string message) =>
        new() { Succeeded = false, Error = error, ErrorMessage = message };
}
