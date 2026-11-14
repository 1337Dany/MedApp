using MedApp.Services.Services.Email;

namespace MedApp.API.Email;

// Used while no SMTP server is configured. Development writes the mail to the log so a reset link can be tried
// locally; elsewhere the text is dropped, because a reset link in a log file is a password for whoever reads it.
public class LoggingEmailSender : IEmailSender
{
    private readonly ILogger<LoggingEmailSender> _logger;
    private readonly IHostEnvironment _environment;

    public LoggingEmailSender(ILogger<LoggingEmailSender> logger, IHostEnvironment environment)
    {
        _logger = logger;
        _environment = environment;
    }

    public Task SendAsync(string to, string subject, string body, CancellationToken ct = default)
    {
        if (_environment.IsDevelopment())
        {
            _logger.LogInformation("Mail is not configured. Message to {To}: {Subject}\n{Body}", to, subject, body);
        }
        else
        {
            _logger.LogWarning("Mail is not configured (Email:Smtp:Host); a message '{Subject}' was not sent.", subject);
        }

        return Task.CompletedTask;
    }
}
