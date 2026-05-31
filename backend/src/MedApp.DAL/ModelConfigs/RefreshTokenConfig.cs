using MedApp.Models.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MedApp.DAL.ModelConfigs;

public class RefreshTokenConfig : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.ToTable("RefreshTokens", "public");

        builder.HasKey(rt => rt.Id);

        builder
            .Property(rt => rt.Id)
            .ValueGeneratedOnAdd()
            .HasDefaultValueSql("gen_random_uuid()");

        builder
            .Property(rt => rt.TokenHash)
            .HasMaxLength(128)
            .IsRequired();

        builder
            .Property(rt => rt.ExpiresAt)
            .IsRequired();

        builder
            .Property(rt => rt.CreatedAt)
            .IsRequired();

        builder
            .HasOne(rt => rt.User)
            .WithMany(u => u.RefreshTokens)
            .HasForeignKey(rt => rt.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder
            .HasIndex(rt => rt.TokenHash)
            .IsUnique();

        builder
            .HasIndex(rt => rt.UserId);

        builder.Ignore(rt => rt.IsActive);
    }
}
