using AutoMapper;
using MedApp.Models.Models;
using MedApp.Services.DTOs.Topics;

namespace MedApp.Services.Mapping;

public class TopicProfile : Profile
{
    public TopicProfile()
    {
        CreateMap<Topic, TopicDto>()
            .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.TopicId))
            .ForMember(dest => dest.Title, opt => opt.MapFrom(src => src.TopicTitle));

        // Order is resolved by TopicService (append on create, keep on update).
        CreateMap<TopicRequest, Topic>()
            .ForMember(dest => dest.TopicTitle, opt => opt.MapFrom(src => src.Title))
            .ForMember(dest => dest.TopicId, opt => opt.Ignore())
            .ForMember(dest => dest.SubjectId, opt => opt.Ignore())
            .ForMember(dest => dest.Subject, opt => opt.Ignore())
            .ForMember(dest => dest.Order, opt => opt.Ignore())
            .ForMember(dest => dest.LastStudied, opt => opt.Ignore())
            .ForMember(dest => dest.NextReview, opt => opt.Ignore())
            .ForMember(dest => dest.ReviewStage, opt => opt.Ignore());
    }
}
