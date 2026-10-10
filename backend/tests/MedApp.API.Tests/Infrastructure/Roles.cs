using System.Net.Http.Headers;
using MedApp.DAL.Context;
using MedApp.Models.Models.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace MedApp.API.Tests.Infrastructure;

public static class Roles
{
    // There is no self-service way to get a staff role, so tests set it in the database (as the first admin
    // is set in production) and sign in again to get a token with the new role.
    public static async Task<(HttpClient Client, Guid UserId)> CreateUserWithRoleAsync(ApiFactory factory, UserRole role)
    {
        var client = factory.CreateClient();
        var email = $"{role.ToString().ToLowerInvariant()}-{Guid.NewGuid():N}@example.com";
        await TestClient.RegisterAsync(client, email, dataPermission: false);

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<MedAppDbContext>();
            await db.Users.Where(u => u.Email == email).ExecuteUpdateAsync(s => s.SetProperty(u => u.Role, role));
        }

        var tokens = await TestClient.LoginAsync(client, email);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokens.AccessToken);

        var me = await (await client.GetAsync("/api/auth/me")).ReadAsync<UserDto>();
        return (client, me.Id);
    }
}

public record UserDto(Guid Id, string FirstName, string LastName, DateOnly DateOfBirth, string Email, bool DataPermission,
    string Role);
