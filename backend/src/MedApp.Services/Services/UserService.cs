using AutoMapper;
using MedApp.Models.Models;
using MedApp.Models.Models.Enums;
using MedApp.Services.DTOs.Users;
using MedApp.Services.Repositories;
using Microsoft.AspNetCore.Identity;

namespace MedApp.Services.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _users;
    private readonly IUnitOfWork _uow;
    private readonly IMapper _mapper;

    private readonly IPasswordHasher<User> _passwordHasher;

    public UserService(IUserRepository users, IUnitOfWork uow, IMapper mapper, IPasswordHasher<User> passwordHasher)
    {
        _passwordHasher = passwordHasher;
        _users = users;
        _uow = uow;
        _mapper = mapper;
    }

    public async Task<UserDto?> UpdateProfileAsync(Guid userId, UpdateProfileRequest request, CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(userId, ct);
        if (user is null)
        {
            return null;
        }

        _mapper.Map(request, user);
        user.FirstName = user.FirstName.Trim();
        user.LastName = user.LastName.Trim();

        await _uow.SaveChangesAsync(ct);
        return _mapper.Map<UserDto>(user);
    }

    public async Task<IEnumerable<UserDto>> GetAllAsync(CancellationToken ct = default)
    {
        var users = await _users.GetAllAsync(ct);
        return _mapper.Map<IEnumerable<UserDto>>(users);
    }

    public async Task<ServiceResult<UserDto>> SetRoleAsync(Guid targetUserId, Guid callerId, UserRole role,
        CancellationToken ct = default)
    {
        if (targetUserId == callerId)
        {
            return ServiceResult<UserDto>.Failure(ServiceError.NotAllowed, "You cannot change your own role.");
        }

        var user = await _users.GetByIdAsync(targetUserId, ct);
        if (user is null)
        {
            return ServiceResult<UserDto>.Failure(ServiceError.NotFound, "User not found.");
        }

        // Takes effect with the user's next access token (at most Jwt:AccessTokenMinutes).
        user.Role = role;
        await _uow.SaveChangesAsync(ct);
        return ServiceResult<UserDto>.Success(_mapper.Map<UserDto>(user));
    }

    public async Task<ServiceResult<bool>> DeleteAccountAsync(Guid userId, DeleteAccountRequest request, CancellationToken ct = default)
    {
        var user = await _users.GetByIdAsync(userId, ct);
        if (user is null)
        {
            return ServiceResult<bool>.Failure(ServiceError.NotFound, "User not found.");
        }

        if (_passwordHasher.VerifyHashedPassword(user, user.HashedPassword, request.Password) == PasswordVerificationResult.Failed)
        {
            return ServiceResult<bool>.Failure(ServiceError.NotAllowed, "The password is not correct.");
        }

        // Roles are granted by admins only, so the last one must hand the role over first.
        if (user.Role == UserRole.Admin && await _users.CountAdminsAsync(ct) <= 1)
        {
            return ServiceResult<bool>.Failure(ServiceError.NotAllowed,
                "You are the only admin. Make another user an admin before deleting your account.");
        }

        await _users.DeleteWithDataAsync(userId, ct);
        return ServiceResult<bool>.Success(true);
    }
}
