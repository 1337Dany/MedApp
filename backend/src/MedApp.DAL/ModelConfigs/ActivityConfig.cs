using MedApp.Models.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MedApp.DAL.ModelConfigs;

public class ActivityConfig : IEntityTypeConfiguration<Activity>
{
    public void Configure(EntityTypeBuilder<Activity> builder)
    {
        builder
            .HasKey(a => a.ActivityId);
        
        builder
            .Property(a => a.ActivityId)
            .ValueGeneratedOnAdd()
            .HasDefaultValueSql("gen_random_uuid()");
        
        builder
            .HasOne(a => a.Subject)
            .WithMany(s => s.Activities)
            .HasForeignKey(a => a.SubjectId)
            .IsRequired();
        
        builder
            .Property(a => a.Title)
            .HasMaxLength(100)
            .IsRequired();
        
        builder
            .HasOne(a => a.ActivityType)
            .WithMany(t => t.Activities)
            .HasForeignKey(a => a.ActivityTypeId)
            .IsRequired();

        builder
            .Property(a => a.Priority)
            .IsRequired();
        
        builder
            .Property(a => a.StartTime)
            .IsRequired();
        
        builder
            .Property(a => a.DurationMinutes)
            .IsRequired();
        
        builder
            .Property(a => a.IsRecurring)
            .IsRequired();

        builder
            .HasOne(a => a.RecurringOptions)
            .WithMany(r => r.Activities)
            .HasForeignKey(a => a.RecurringOptionsId)
            .IsRequired(false);
        
        builder
            .Property(a => a.IsNegotiable)
            .IsRequired();

        builder
            .Property(a => a.Notes)
            .HasMaxLength(500)
            .IsRequired(false);

    }
}