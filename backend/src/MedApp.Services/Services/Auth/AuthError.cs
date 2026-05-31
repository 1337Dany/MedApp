namespace MedApp.Services.Services.Auth;

public enum AuthError
{
    None = 0,
    EmailAlreadyTaken,
    InvalidCredentials,
    InvalidRefreshToken
}
