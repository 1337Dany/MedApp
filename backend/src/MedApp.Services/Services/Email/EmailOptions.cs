namespace MedApp.Services.Services.Email;

// Outgoing mail (password reset). Without Smtp:Host nothing is sent: Development logs the message instead.
public class EmailOptions
{
    public const string SectionName = "Email";

    // Address of the web app as users open it (e.g. https://medapp.example.com); links in mails start with it.
    // Required when mail is sent: a link must never be built from a request's Host header.
    public string? PublicUrl { get; set; }
    public string? From { get; set; }
    public int PasswordResetMinutes { get; set; } = 60;
    public SmtpOptions Smtp { get; set; } = new();

    public bool SendsMail => !string.IsNullOrWhiteSpace(Smtp.Host);
}

public class SmtpOptions
{
    public string? Host { get; set; }
    public int Port { get; set; } = 587;
    public string? User { get; set; }
    public string? Password { get; set; }
    public bool EnableSsl { get; set; } = true;
}
