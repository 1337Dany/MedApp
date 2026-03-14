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
    }
}