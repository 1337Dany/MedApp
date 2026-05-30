using MedApp.DAL.Context;
using MedApp.DAL.Repositories;
using MedApp.Models.Models.Enums;
using MedApp.Services.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace MedApp.DAL;

public static class DependencyInjection
{
    public static IServiceCollection AddMedAppDal(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Postgres");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "ConnectionStrings:Postgres is not configured. " +
                "Set it in appsettings.Development.json, user-secrets or the ConnectionStrings__Postgres environment variable.");
        }

        // NOTE: only UserRole is mapped as a Postgres enum here. The Feedback/Status/StudyMode/
        // Frequency/DayOfWeekEnum types exist in the DB (from InitialCreate) but their entity
        // columns are still stored as `integer`, so we deliberately do not map them at the EF /
        // data source level yet.
        var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
        dataSourceBuilder.MapEnum<UserRole>();
        var dataSource = dataSourceBuilder.Build();

        services.AddSingleton(dataSource);
        services.AddDbContext<MedAppDbContext>(options =>
            options.UseNpgsql(dataSource, npgsql =>
            {
                npgsql.MapEnum<UserRole>("user_role");
            }));

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IRefreshTokenRepository, RefreshTokenRepository>();
        services.AddScoped<IActivityRepository, ActivityRepository>();
        services.AddScoped<IActivityTypeRepository, ActivityTypeRepository>();
        services.AddScoped<IStudyStrategyRepository, StudyStrategyRepository>();
        services.AddScoped<IRecurringOptionsRepository, RecurringOptionsRepository>();
        services.AddScoped<IOptionsDayOfWeekRepository, OptionsDayOfWeekRepository>();
        services.AddScoped<ITopicRepository, TopicRepository>();
        services.AddScoped<ISubjectRepository, SubjectRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        return services;
    }
}
