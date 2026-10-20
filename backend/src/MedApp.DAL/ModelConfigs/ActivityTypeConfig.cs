using MedApp.Models.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MedApp.DAL.ModelConfigs;

public class ActivityTypeConfig : IEntityTypeConfiguration<ActivityType>
{
    public void Configure(EntityTypeBuilder<ActivityType> builder)
    {
        builder
            .HasKey(at => at.TypeId);

        builder
            .Property(a => a.TypeId)
            .ValueGeneratedOnAdd();

        builder
            .Property(at => at.TypeName)
            .HasMaxLength(50)
            .IsRequired();

        builder.HasData(
            new ActivityType { TypeId = 1, TypeName = "Studying" },
            new ActivityType { TypeId = 2, TypeName = "Class" },
            new ActivityType { TypeId = 3, TypeName = "Rest" },
            new ActivityType { TypeId = 4, TypeName = "Sport" },
            new ActivityType { TypeId = 5, TypeName = "Work" },
            new ActivityType { TypeId = 6, TypeName = "Meal" },
            new ActivityType { TypeId = 7, TypeName = "Sleep" },
            new ActivityType { TypeId = 8, TypeName = "Commute" },
            new ActivityType { TypeId = 9, TypeName = "One-Time Event" });
    }
}