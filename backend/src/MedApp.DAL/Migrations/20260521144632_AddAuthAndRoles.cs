using System;
using MedApp.Models.Models.Enums;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MedApp.DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddAuthAndRoles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // NOTE: EF cannot serialise the seeded user's Role into the model snapshot when
            // it maps to a Postgres enum column (known limitation in npgsql/efcore.pg #3778).
            // The scaffolder therefore wanted to DeleteData the seeded user; we override that
            // here and instead set the Role to 'admin' after the column is added below.
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:Enum:day_of_week_enum", "monday,tuesday,wednesday,thursday,friday,saturday,sunday")
                .Annotation("Npgsql:Enum:feedback", "red,yellow,green")
                .Annotation("Npgsql:Enum:frequency", "daily,weekly")
                .Annotation("Npgsql:Enum:status", "scheduled,partially_done,done,skipped")
                .Annotation("Npgsql:Enum:study_mode", "relaxed,determined,emergency")
                .Annotation("Npgsql:Enum:user_role", "user,admin")
                .OldAnnotation("Npgsql:Enum:day_of_week_enum", "monday,tuesday,wednesday,thursday,friday,saturday,sunday")
                .OldAnnotation("Npgsql:Enum:feedback", "red,yellow,green")
                .OldAnnotation("Npgsql:Enum:frequency", "daily,weekly")
                .OldAnnotation("Npgsql:Enum:status", "scheduled,partially_done,done,skipped")
                .OldAnnotation("Npgsql:Enum:study_mode", "relaxed,determined,emergency");

            migrationBuilder.AddColumn<UserRole>(
                name: "Role",
                schema: "public",
                table: "Users",
                type: "user_role",
                nullable: false,
                defaultValue: UserRole.User);

            migrationBuilder.UpdateData(
                schema: "public",
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("8898cf29-4ca3-44c3-82b1-e5c55bc3f549"),
                column: "Role",
                value: UserRole.Admin);

            migrationBuilder.CreateTable(
                name: "RefreshTokens",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RevokedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ReplacedByTokenId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RefreshTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RefreshTokens_Users_UserId",
                        column: x => x.UserId,
                        principalSchema: "public",
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                schema: "public",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_TokenHash",
                schema: "public",
                table: "RefreshTokens",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_UserId",
                schema: "public",
                table: "RefreshTokens",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RefreshTokens",
                schema: "public");

            migrationBuilder.DropIndex(
                name: "IX_Users_Email",
                schema: "public",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Role",
                schema: "public",
                table: "Users");

            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:Enum:day_of_week_enum", "monday,tuesday,wednesday,thursday,friday,saturday,sunday")
                .Annotation("Npgsql:Enum:feedback", "red,yellow,green")
                .Annotation("Npgsql:Enum:frequency", "daily,weekly")
                .Annotation("Npgsql:Enum:status", "scheduled,partially_done,done,skipped")
                .Annotation("Npgsql:Enum:study_mode", "relaxed,determined,emergency")
                .OldAnnotation("Npgsql:Enum:day_of_week_enum", "monday,tuesday,wednesday,thursday,friday,saturday,sunday")
                .OldAnnotation("Npgsql:Enum:feedback", "red,yellow,green")
                .OldAnnotation("Npgsql:Enum:frequency", "daily,weekly")
                .OldAnnotation("Npgsql:Enum:status", "scheduled,partially_done,done,skipped")
                .OldAnnotation("Npgsql:Enum:study_mode", "relaxed,determined,emergency")
                .OldAnnotation("Npgsql:Enum:user_role", "user,admin");

            // Up no longer deletes the seeded user, so Down doesn't need to re-insert it.
        }
    }
}
