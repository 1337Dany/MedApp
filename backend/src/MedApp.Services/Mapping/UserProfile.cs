using AutoMapper;
using MedApp.Models.Models;
using MedApp.Services.DTOs.Auth;
using MedApp.Services.DTOs.Users;

namespace MedApp.Services.Mapping;

public class UserProfile : Profile
{
    public UserProfile()
    {
        CreateMap<User, UserDto>();

        CreateMap<RegisterRequest, User>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.HashedPassword, opt => opt.Ignore())
            .ForMember(dest => dest.Role, opt => opt.Ignore())
            .ForMember(dest => dest.Subjects, opt => opt.Ignore())
            .ForMember(dest => dest.RefreshTokens, opt => opt.Ignore());
    }
}
