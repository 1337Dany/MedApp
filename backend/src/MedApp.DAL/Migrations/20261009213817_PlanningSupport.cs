using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MedApp.DAL.Migrations
{
    /// <inheritdoc />
    public partial class PlanningSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TimeZone",
                schema: "public",
                table: "Users",
                type: "character varying(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ReviewStage",
                table: "Topics",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "IsAutoPlanned",
                table: "Activities",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TimeZone",
                schema: "public",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ReviewStage",
                table: "Topics");

            migrationBuilder.DropColumn(
                name: "IsAutoPlanned",
                table: "Activities");
        }
    }
}
