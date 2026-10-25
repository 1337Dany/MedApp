using MedApp.Models.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MedApp.DAL.ModelConfigs;

public class ActivityOccurrenceConfig : IEntityTypeConfiguration<ActivityOccurrence>
{
    public void Configure(EntityTypeBuilder<ActivityOccurrence> builder)
    {
        builder
            .HasKey(o => o.ActivityOccurrenceId);

        builder
            .Property(o => o.ActivityOccurrenceId)
            .ValueGeneratedOnAdd()
            .HasDefaultValueSql("gen_random_uuid()");

        builder
            .HasOne(o => o.User)
            .WithMany()
            .HasForeignKey(o => o.UserId)
            .IsRequired()
            .OnDelete(DeleteBehavior.Cascade);

        // The history outlives the activity and the subject.
        builder
            .HasOne(o => o.Activity)
            .WithMany(a => a.Occurrences)
            .HasForeignKey(o => o.ActivityId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        builder
            .HasOne(o => o.Subject)
            .WithMany()
            .HasForeignKey(o => o.SubjectId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);

        builder
            .HasOne(o => o.ActivityType)
            .WithMany()
            .HasForeignKey(o => o.ActivityTypeId)
            .IsRequired()
            .OnDelete(DeleteBehavior.Restrict);

        builder
            .Property(o => o.Title)
            .HasMaxLength(100)
            .IsRequired();

        builder
            .Property(o => o.StartTime)
            .IsRequired();

        builder
            .Property(o => o.DurationMinutes)
            .IsRequired();

        builder
            .HasIndex(o => new { o.UserId, o.StartTime });

        // One row per occurrence of an activity (rows of deleted activities have no ActivityId).
        builder
            .HasIndex(o => new { o.ActivityId, o.StartTime })
            .IsUnique();
    }
}
