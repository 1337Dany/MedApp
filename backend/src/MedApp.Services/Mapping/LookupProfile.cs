using AutoMapper;
using MedApp.Models.Models;
using MedApp.Services.DTOs.Lookups;

namespace MedApp.Services.Mapping;

public class LookupProfile : Profile
{
    public LookupProfile()
    {
        CreateMap<StudyStrategy, LookupDto>()
            .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.MethodId))
            .ForMember(dest => dest.Name, opt => opt.MapFrom(src => src.MethodName));

        CreateMap<ActivityType, LookupDto>()
            .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.TypeId))
            .ForMember(dest => dest.Name, opt => opt.MapFrom(src => src.TypeName));
    }
}
