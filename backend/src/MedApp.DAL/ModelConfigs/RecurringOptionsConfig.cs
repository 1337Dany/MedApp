using MedApp.Models.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MedApp.DAL.ModelConfigs;

public class RecurringOptionsConfig : IEntityTypeConfiguration<RecurringOptions>
{
    public void Configure(EntityTypeBuilder<RecurringOptions> builder)
    {
        builder
            .HasKey(ro => ro.RecurringOptionsId);

        builder
            .Property(ro => ro.RecurringOptionsId)
            .ValueGeneratedOnAdd()
            .HasDefaultValueSql("gen_random_uuid()");

        builder
            .HasMany(ro => ro.DaysOfWeek)
            .WithOne(d => d.RecurringOptions)
            .HasForeignKey(d => d.RecurringOptionsId);

        builder
            .HasMany(ro => ro.Activities)
            .WithOne(a => a.RecurringOptions)
            .HasForeignKey(a => a.RecurringOptionsId);
    }
}