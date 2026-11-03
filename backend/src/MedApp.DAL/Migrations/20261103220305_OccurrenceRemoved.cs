using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MedApp.DAL.Migrations
{
    /// <inheritdoc />
    public partial class OccurrenceRemoved : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsRemoved",
                table: "ActivityOccurrences",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsRemoved",
                table: "ActivityOccurrences");
        }
    }
}
