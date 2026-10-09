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

        builder.HasData(
            new StudyStrategy { MethodId = 1, MethodName = "Traffic Light" },
            new StudyStrategy { MethodId = 2, MethodName = "Active Recall" },
            new StudyStrategy { MethodId = 3, MethodName = "Manual" });
    }
}