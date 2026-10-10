using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MedApp.DAL.Migrations
{
    /// <inheritdoc />
    public partial class CoreCrudModelGaps : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Activities_RecurringOptions_RecurringOptionsId",
                table: "Activities");

            migrationBuilder.AlterColumn<string>(
                name: "TopicTitle",
                table: "Topics",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(50)",
                oldMaxLength: 50);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastStudied",
                table: "Topics",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "NextReview",
                table: "Topics",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Order",
                table: "Topics",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AlterColumn<DateOnly>(
                name: "ExamDate",
                table: "Subjects",
                type: "date",
                nullable: true,
                oldClrType: typeof(DateOnly),
                oldType: "date");

            migrationBuilder.AddColumn<DateOnly>(
                name: "Until",
                table: "RecurringOptions",
                type: "date",
                nullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "SubjectId",
                table: "Activities",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<Guid>(
                name: "TopicId",
                table: "Activities",
                type: "uuid",
                nullable: true);

            // Existing activities all have a subject: take the owner from it, then make the column required.
            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "Activities",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE "Activities" AS a
                SET "UserId" = s."UserId"
                FROM "Subjects" AS s
                WHERE a."SubjectId" = s."SubjectId";
                """);

            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                table: "Activities",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            // Keep the current alphabetical order of existing topics within each subject.
            migrationBuilder.Sql(
                """
                UPDATE "Topics" AS t
                SET "Order" = o.rn
                FROM (SELECT "TopicId", ROW_NUMBER() OVER (PARTITION BY "SubjectId" ORDER BY "TopicTitle") - 1 AS rn
                      FROM "Topics") AS o
                WHERE t."TopicId" = o."TopicId";
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Activities_TopicId",
                table: "Activities",
                column: "TopicId");

            migrationBuilder.CreateIndex(
                name: "IX_Activities_UserId_StartTime",
                table: "Activities",
                columns: new[] { "UserId", "StartTime" });

            migrationBuilder.AddForeignKey(
                name: "FK_Activities_RecurringOptions_RecurringOptionsId",
                table: "Activities",
                column: "RecurringOptionsId",
                principalTable: "RecurringOptions",
                principalColumn: "RecurringOptionsId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Activities_Topics_TopicId",
                table: "Activities",
                column: "TopicId",
                principalTable: "Topics",
                principalColumn: "TopicId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Activities_Users_UserId",
                table: "Activities",
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
                name: "FK_Activities_RecurringOptions_RecurringOptionsId",
                table: "Activities");

            migrationBuilder.DropForeignKey(
                name: "FK_Activities_Topics_TopicId",
                table: "Activities");

            migrationBuilder.DropForeignKey(
                name: "FK_Activities_Users_UserId",
                table: "Activities");

            migrationBuilder.DropIndex(
                name: "IX_Activities_TopicId",
                table: "Activities");

            migrationBuilder.DropIndex(
                name: "IX_Activities_UserId_StartTime",
                table: "Activities");

            migrationBuilder.DropColumn(
                name: "LastStudied",
                table: "Topics");

            migrationBuilder.DropColumn(
                name: "NextReview",
                table: "Topics");

            migrationBuilder.DropColumn(
                name: "Order",
                table: "Topics");

            migrationBuilder.DropColumn(
                name: "Until",
                table: "RecurringOptions");

            migrationBuilder.DropColumn(
                name: "TopicId",
                table: "Activities");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Activities");

            migrationBuilder.AlterColumn<string>(
                name: "TopicTitle",
                table: "Topics",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<DateOnly>(
                name: "ExamDate",
                table: "Subjects",
                type: "date",
                nullable: false,
                defaultValue: new DateOnly(1, 1, 1),
                oldClrType: typeof(DateOnly),
                oldType: "date",
                oldNullable: true);

            // Activities without a subject cannot exist in the old schema.
            migrationBuilder.Sql("""DELETE FROM "Activities" WHERE "SubjectId" IS NULL;""");

            migrationBuilder.AlterColumn<Guid>(
                name: "SubjectId",
                table: "Activities",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Activities_RecurringOptions_RecurringOptionsId",
                table: "Activities",
                column: "RecurringOptionsId",
                principalTable: "RecurringOptions",
                principalColumn: "RecurringOptionsId");
        }
    }
}
