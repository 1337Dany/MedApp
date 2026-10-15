using AutoMapper;
using MedApp.Models.Models;
using MedApp.Services.DTOs.Subjects;

namespace MedApp.Services.Mapping;

public class SubjectProfile : Profile
{
    public SubjectProfile()
    {
        CreateMap<Subject, SubjectDto>()
            .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.SubjectId));

        CreateMap<SubjectRequest, Subject>()
            .ForMember(dest => dest.SubjectId, opt => opt.Ignore())
            .ForMember(dest => dest.UserId, opt => opt.Ignore())
            .ForMember(dest => dest.User, opt => opt.Ignore())
            .ForMember(dest => dest.PlanningMethod, opt => opt.Ignore())
            .ForMember(dest => dest.Topics, opt => opt.Ignore())
            .ForMember(dest => dest.Activities, opt => opt.Ignore());
    }
}
