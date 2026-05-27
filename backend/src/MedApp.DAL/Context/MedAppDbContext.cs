using System.Reflection;
using MedApp.Models.Models;
using MedApp.Models.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace MedApp.DAL.Context;

public class MedAppDbContext : DbContext
{
    public MedAppDbContext(DbContextOptions<MedAppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Activity> Activities { get; set; }
    public DbSet<ActivityType> ActivityTypes { get; set; }
    public DbSet<OptionsDayOfWeek> OptionsDayOfWeek { get; set; }
    public DbSet<RecurringOptions> RecurringOptions { get; set; }
    public DbSet<StudyStrategy> StudyStrategies { get; set; }
    public DbSet<Subject> Subjects { get; set; }
    public DbSet<Topic> Topics { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<RefreshToken> RefreshTokens { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.HasPostgresEnum<Feedback>();
        modelBuilder.HasPostgresEnum<StudyMode>();
        modelBuilder.HasPostgresEnum<Status>();
        modelBuilder.HasPostgresEnum<Frequency>();
        modelBuilder.HasPostgresEnum<DayOfWeekEnum>();
        modelBuilder.HasPostgresEnum<UserRole>();

        modelBuilder
            .Entity<User>()
            .ToTable("Users", "public");

        // apply configs
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
    }
}
