using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MedApp.DAL.Migrations
{
    /// <inheritdoc />
    public partial class NewMigration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Users",
                columns: new[] { "Id", "DataPermission", "DateOfBirth", "Email", "FirstName", "HashedPassword", "LastName" },
                values: new object[] { new Guid("8898cf29-4ca3-44c3-82b1-e5c55bc3f549"), true, new DateOnly(2006, 4, 20), "sisoev.a@outlook.com", "Andrii", "somehash", "Sysoiev" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: new Guid("8898cf29-4ca3-44c3-82b1-e5c55bc3f549"));
        }
    }
}
