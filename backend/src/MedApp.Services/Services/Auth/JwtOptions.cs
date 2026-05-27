namespace MedApp.Services.Services.Auth;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = null!;
    public string Audience { get; set; } = null!;
    public string Key { get; set; } = null!;
    public int AccessTokenMinutes { get; set; } = 60;
    public int RefreshTokenDays { get; set; } = 30;
    public int ClockSkewSeconds { get; set; } = 30;
}
