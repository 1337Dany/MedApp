using FluentValidation;
using MedApp.DAL.Context;
using MedApp.DAL.Repositories;
using MedApp.Models.Models;
using MedApp.Services;
using MedApp.Services.Mapping;
using MedApp.Services.Repositories;
using MedApp.Services.Services;
using MedApp.Services.Services.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace MedApp.API;

public static class DependencyInjection
{
    public static IServiceCollection AddMedAppInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services
            .AddDatabaseAndContext(configuration)
            .AddRepositories()
            .AddDomainServices()
            .AddJwtConfiguration(configuration)
            .AddAuthServices();

        return services;
    }

    private static IServiceCollection AddDatabaseAndContext(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Postgres");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "ConnectionStrings:Postgres is not configured. " +
                "Set it in appsettings.Development.json, user-secrets or the ConnectionStrings__Postgres environment variable.");
        }

        var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
        var dataSource = dataSourceBuilder.Build();

        services.AddSingleton(dataSource);
        services.AddDbContext<MedAppDbContext>(options =>
            options.UseNpgsql(dataSource));

        return services;
    }

    private static IServiceCollection AddRepositories(this IServiceCollection services)
    {
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
        services.AddScoped<IActivityRepository, ActivityRepository>();
        services.AddScoped<IActivityTypeRepository, ActivityTypeRepository>();
        services.AddScoped<IStudyStrategyRepository, StudyStrategyRepository>();
        services.AddScoped<IRecurringOptionsRepository, RecurringOptionsRepository>();
        services.AddScoped<ITopicRepository, TopicRepository>();
        services.AddScoped<ISubjectRepository, SubjectRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        return services;
    }

    private static IServiceCollection AddDomainServices(this IServiceCollection services)
    {
        services.AddScoped<ISubjectService, SubjectService>();
        services.AddScoped<ITopicService, TopicService>();
        services.AddScoped<IActivityService, ActivityService>();
        services.AddScoped<IActivityTypeService, ActivityTypeService>();
        services.AddScoped<IStudyStrategyService, StudyStrategyService>();
        services.AddScoped<IPlanningService, PlanningService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<ITeacherAnalyticsService, TeacherAnalyticsService>();

        return services;
    }

    private static IServiceCollection AddJwtConfiguration(this IServiceCollection services, IConfiguration configuration)
    {
        services
            .AddOptions<JwtOptions>()
            .Bind(configuration.GetSection(JwtOptions.SectionName))
            .Validate(o => !string.IsNullOrWhiteSpace(o.Key) && o.Key.Length >= 32,
                "Jwt:Key must be at least 32 characters long.")
            .Validate(o => !string.IsNullOrWhiteSpace(o.Issuer), "Jwt:Issuer must be configured.")
            .Validate(o => !string.IsNullOrWhiteSpace(o.Audience), "Jwt:Audience must be configured.")
            .ValidateOnStart();

        return services;
    }

    private static IServiceCollection AddAuthServices(this IServiceCollection services)
    {
        services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IAuthService, AuthService>();

        // AutoMapper & FluentValidation configuration
        services.AddAutoMapper(_ => { }, typeof(ServicesAssemblyMarker));
        services.AddValidatorsFromAssembly(typeof(UserProfile).Assembly);

        return services;
    }
}
