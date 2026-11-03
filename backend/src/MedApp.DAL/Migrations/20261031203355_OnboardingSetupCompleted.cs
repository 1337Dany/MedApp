using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MedApp.DAL.Migrations
{
    /// <inheritdoc />
    public partial class OnboardingSetupCompleted : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "SetupCompleted",
                schema: "public",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // Accounts with data have long passed the first visit, so they are not offered demo data again.
            migrationBuilder.Sql("""
                UPDATE public."Users" u SET "SetupCompleted" = TRUE
                WHERE EXISTS (SELECT 1 FROM public."Subjects" s WHERE s."UserId" = u."Id")
                   OR EXISTS (SELECT 1 FROM public."Activities" a WHERE a."UserId" = u."Id");
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SetupCompleted",
                schema: "public",
                table: "Users");
        }
    }
}
