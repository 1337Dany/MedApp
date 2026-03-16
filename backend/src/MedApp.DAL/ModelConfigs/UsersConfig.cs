using MedApp.Models.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MedApp.DAL.ModelConfigs;

public class UsersConfig : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder
            .HasKey(u => u.Id);

        builder
            .Property(u => u.Id)
            .ValueGeneratedOnAdd()
            .HasDefaultValueSql("gen_random_uuid()");

        builder
            .Property(u => u.FirstName)
            .HasMaxLength(50)
            .IsRequired();

        builder
            .Property(u => u.LastName)
            .HasMaxLength(50)
            .IsRequired();

        builder
            .Property(u => u.Email)
            .HasMaxLength(75)
            .IsRequired();

        builder
            .Property(u => u.DateOfBirth)
            .IsRequired();

        builder
            .Property(u => u.HashedPassword)
            .IsRequired();

        builder
            .Property(u => u.DataPermission)
            .IsRequired();
    }
}