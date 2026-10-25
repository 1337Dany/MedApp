using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MedApp.DAL.Migrations
{
    /// <inheritdoc />
    public partial class ActivityHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "HistoryRecordedUntil",
                table: "Activities",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ActivityOccurrences",
                columns: table => new
                {
                    ActivityOccurrenceId = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActivityId = table.Column<Guid>(type: "uuid", nullable: true),
                    SubjectId = table.Column<Guid>(type: "uuid", nullable: true),
                    Title = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ActivityTypeId = table.Column<int>(type: "integer", nullable: false),
                    StartTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DurationMinutes = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ActivityOccurrences", x => x.ActivityOccurrenceId);
                    table.ForeignKey(
                        name: "FK_ActivityOccurrences_Activities_ActivityId",
                        column: x => x.ActivityId,
                        principalTable: "Activities",
                        principalColumn: "ActivityId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ActivityOccurrences_ActivityTypes_ActivityTypeId",
                        column: x => x.ActivityTypeId,
                        principalTable: "ActivityTypes",
                        principalColumn: "TypeId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ActivityOccurrences_Subjects_SubjectId",
                        column: x => x.SubjectId,
                        principalTable: "Subjects",
                        principalColumn: "SubjectId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ActivityOccurrences_Users_UserId",
                        column: x => x.UserId,
                        principalSchema: "public",
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ActivityOccurrences_ActivityId_StartTime",
                table: "ActivityOccurrences",
                columns: new[] { "ActivityId", "StartTime" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ActivityOccurrences_ActivityTypeId",
                table: "ActivityOccurrences",
                column: "ActivityTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityOccurrences_SubjectId",
                table: "ActivityOccurrences",
                column: "SubjectId");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityOccurrences_UserId_StartTime",
                table: "ActivityOccurrences",
                columns: new[] { "UserId", "StartTime" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ActivityOccurrences");

            migrationBuilder.DropColumn(
                name: "HistoryRecordedUntil",
                table: "Activities");
        }
    }
}
