using MedApp.Models.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MedApp.DAL.ModelConfigs;

public class StudyStrategyConfig : IEntityTypeConfiguration<StudyStrategy>
{
    public void Configure(EntityTypeBuilder<StudyStrategy> builder)
    {
        builder
            .HasKey(ss => ss.MethodId);

        builder
            .Property(ss => ss.MethodId)
            .ValueGeneratedOnAdd();

        builder
            .HasMany(ss => ss.Subjects)
            .WithOne(s => s.PlanningMethod)
            .HasForeignKey(s => s.PlanningMethodId);
    }
}