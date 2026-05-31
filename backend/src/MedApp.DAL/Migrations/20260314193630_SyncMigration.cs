using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MedApp.DAL.Migrations
{
    /// <inheritdoc />
    public partial class SyncMigration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Subjects_\"Users\"_UserId",
                table: "Subjects");

            migrationBuilder.DropPrimaryKey(
                name: "PK_\"Users\"",
                schema: "public",
                table: "\"Users\"");

            migrationBuilder.RenameTable(
                name: "\"Users\"",
                schema: "public",
                newName: "Users",
                newSchema: "public");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Users",
                schema: "public",
                table: "Users",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Subjects_Users_UserId",
                table: "Subjects",
                column: "UserId",
                principalSchema: "public",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Subjects_Users_UserId",
                table: "Subjects");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Users",
                schema: "public",
                table: "Users");

            migrationBuilder.RenameTable(
                name: "Users",
                schema: "public",
                newName: "\"Users\"",
                newSchema: "public");

            migrationBuilder.AddPrimaryKey(
                name: "PK_\"Users\"",
                schema: "public",
                table: "\"Users\"",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Subjects_\"Users\"_UserId",
                table: "Subjects",
                column: "UserId",
                principalSchema: "public",
                principalTable: "\"Users\"",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
