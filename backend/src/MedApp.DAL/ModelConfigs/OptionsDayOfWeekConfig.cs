using MedApp.Models.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MedApp.DAL.ModelConfigs;

public class OptionsDayOfWeekConfig : IEntityTypeConfiguration<OptionsDayOfWeek>
{
    public void Configure(EntityTypeBuilder<OptionsDayOfWeek> builder)
    {
        builder
            .HasKey(odw => new { odw.RecurringOptionsId, odw.DayOfWeek });

        builder
            .HasOne(odw => odw.RecurringOptions)
            .WithMany(odw => odw.DaysOfWeek)
            .HasForeignKey(odw => odw.RecurringOptionsId);

    }
}