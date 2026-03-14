using MedApp.Models.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MedApp.DAL.ModelConfigs;

public class SubjectConfig : IEntityTypeConfiguration<Subject>
{
    public void Configure(EntityTypeBuilder<Subject> builder)
    {
        builder
            .HasKey(s => s.SubjectId);
        
        builder
            .Property(s => s.SubjectId)
            .ValueGeneratedOnAdd()
            .HasDefaultValueSql("gen_random_uuid()");
        
        builder
            .HasOne(s => s.User)
            .WithMany(u => u.Subjects)
            .HasForeignKey(s => s.UserId);
        
        builder
            .Property(s => s.Name)
            .HasMaxLength(50)
            .IsRequired();

        builder
            .Property(s => s.ExamDate)
            .IsRequired();
        
        builder
            .HasOne(s => s.PlanningMethod)
            .WithMany(m => m.Subjects)
            .HasForeignKey(s => s.PlanningMethodId);
        
        builder
            .Property(s => s.Priority)
            .IsRequired();

        builder
            .Property(s => s.ColorHex)
            .HasMaxLength(7)
            .IsRequired();
    }
}