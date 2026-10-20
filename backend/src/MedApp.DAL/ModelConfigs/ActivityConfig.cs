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
            .HasOne(a => a.User)
            .WithMany(u => u.Activities)
            .HasForeignKey(a => a.UserId)
            .IsRequired()
            .OnDelete(DeleteBehavior.Cascade);

        // Deleting a subject deletes its activities (the frontend does the same).
        builder
            .HasOne(a => a.Subject)
            .WithMany(s => s.Activities)
            .HasForeignKey(a => a.SubjectId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasOne(a => a.Topic)
            .WithMany()
            .HasForeignKey(a => a.TopicId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        builder
            .HasIndex(a => new { a.UserId, a.StartTime });

        builder
            .Property(a => a.Title)
            .HasMaxLength(100)
            .IsRequired();

        builder
            .HasOne(a => a.ActivityType)
            .WithMany(t => t.Activities)
            .HasForeignKey(a => a.ActivityTypeId)
            .IsRequired()
            .OnDelete(DeleteBehavior.Restrict);

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
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        builder
            .Property(a => a.IsNegotiable)
            .IsRequired();

        builder
            .Property(a => a.IsAutoPlanned)
            .HasDefaultValue(false)
            .IsRequired();

        builder
            .Property(a => a.Notes)
            .HasMaxLength(500)
            .IsRequired(false);

    }
}