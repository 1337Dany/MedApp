using System;
using MedApp.Models.Models.Enums;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace MedApp.DAL.Migrations
{
    /// <inheritdoc />
    public partial class SeedLookupsRemoveDevUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "ActivityTypes",
                columns: new[] { "TypeId", "TypeName" },
                values: new object[,]
                {
                    { 1, "Studying" },
                    { 2, "Class" },
                    { 3, "Rest" },
                    { 4, "Sport" },
                    { 5, "Work" },
                    { 6, "Meal" },
                    { 7, "Sleep" },
                    { 8, "Commute" },
                    { 9, "One-Time Event" }
                });

            migrationBuilder.InsertData(
                table: "StudyStrategies",
                columns: new[] { "MethodId", "MethodName" },
                values: new object[,]
                {
                    { 1, "Traffic Light" },
                    { 2, "Active Recall" },
                    { 3, "Manual" }
                });

            // Hand-written: the placeholder admin was inserted by NewMigration outside the model
            // (no HasData), so EF can't scaffold its removal. It has no valid password hash.
            migrationBuilder.DeleteData(
                schema: "public",
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("8898cf29-4ca3-44c3-82b1-e5c55bc3f549"));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                schema: "public",
                table: "Users",
                columns: new[] { "Id", "DataPermission", "DateOfBirth", "Email", "FirstName", "HashedPassword", "LastName", "Role" },
                values: new object[] { new Guid("8898cf29-4ca3-44c3-82b1-e5c55bc3f549"), true, new DateOnly(2006, 4, 20), "sisoev.a@outlook.com", "Andrii", "somehash", "Sysoiev", (int)UserRole.Admin });

            migrationBuilder.DeleteData(
                table: "ActivityTypes",
                keyColumn: "TypeId",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "ActivityTypes",
                keyColumn: "TypeId",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "ActivityTypes",
                keyColumn: "TypeId",
                keyValue: 3);

            migrationBuilder.DeleteData(
                table: "ActivityTypes",
                keyColumn: "TypeId",
                keyValue: 4);

            migrationBuilder.DeleteData(
                table: "ActivityTypes",
                keyColumn: "TypeId",
                keyValue: 5);

            migrationBuilder.DeleteData(
                table: "ActivityTypes",
                keyColumn: "TypeId",
                keyValue: 6);

            migrationBuilder.DeleteData(
                table: "ActivityTypes",
                keyColumn: "TypeId",
                keyValue: 7);

            migrationBuilder.DeleteData(
                table: "ActivityTypes",
                keyColumn: "TypeId",
                keyValue: 8);

            migrationBuilder.DeleteData(
                table: "ActivityTypes",
                keyColumn: "TypeId",
                keyValue: 9);

            migrationBuilder.DeleteData(
                table: "StudyStrategies",
                keyColumn: "MethodId",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "StudyStrategies",
                keyColumn: "MethodId",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "StudyStrategies",
                keyColumn: "MethodId",
                keyValue: 3);
        }
    }
}
