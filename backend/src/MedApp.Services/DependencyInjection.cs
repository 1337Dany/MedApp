using FluentValidation;
using MedApp.Models.Models;
using MedApp.Services.Mapping;
using MedApp.Services.Repositories;
using MedApp.Services.Services;
using MedApp.Services.Services.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace MedApp.Services;

public static class DependencyInjection
{
    public static IServiceCollection AddMedAppServices(this IServiceCollection services, IConfiguration configuration)
    {
        services
            .AddOptions<JwtOptions>()
            .Bind(configuration.GetSection(JwtOptions.SectionName))
            .Validate(o => !string.IsNullOrWhiteSpace(o.Key) && o.Key.Length >= 32,
                "Jwt:Key must be at least 32 characters long.")
            .Validate(o => !string.IsNullOrWhiteSpace(o.Issuer), "Jwt:Issuer must be configured.")
            .Validate(o => !string.IsNullOrWhiteSpace(o.Audience), "Jwt:Audience must be configured.")
            .ValidateOnStart();

        services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IAuthService, AuthService>();

        services.AddScoped<ISubjectService, SubjectService>();
        services.AddScoped<ITopicService, TopicService>();
        services.AddScoped<IActivityService, ActivityService>();
        services.AddScoped<IActivityTypeService, ActivityTypeService>();
        services.AddScoped<IStudyStrategyService, StudyStrategyService>();
        services.AddScoped<IRecurringOptionsService, RecurringOptionsService>();
        services.AddScoped<IOptionsDayOfWeekService, OptionsDayOfWeekService>();

        services.AddAutoMapper(_ => { }, typeof(ServicesAssemblyMarker));
        services.AddValidatorsFromAssembly(typeof(UserProfile).Assembly);

        return services;
    }
}
