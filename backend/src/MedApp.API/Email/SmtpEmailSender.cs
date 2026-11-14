using System.Net;
using System.Net.Mail;
using MedApp.Services.Services.Email;
using Microsoft.Extensions.Options;

namespace MedApp.API.Email;

// Plain-text mail through the SMTP server from the Email:Smtp settings.
public class SmtpEmailSender : IEmailSender
{
    private readonly EmailOptions _options;

    public SmtpEmailSender(IOptions<EmailOptions> options)
    {
        _options = options.Value;
    }

    public async Task SendAsync(string to, string subject, string body, CancellationToken ct = default)
    {
        using var client = new SmtpClient(_options.Smtp.Host, _options.Smtp.Port) { EnableSsl = _options.Smtp.EnableSsl };
        if (!string.IsNullOrEmpty(_options.Smtp.User))
        {
            client.Credentials = new NetworkCredential(_options.Smtp.User, _options.Smtp.Password);
        }

        using var message = new MailMessage(_options.From!, to, subject, body);
        await client.SendMailAsync(message, ct);
    }
}
