using AutoMapper;
using MedApp.Models.Models;
using MedApp.Services.DTOs.History;

namespace MedApp.Services.Mapping;

public class HistoryProfile : Profile
{
    public HistoryProfile()
    {
        CreateMap<ActivityOccurrence, OccurrenceDto>()
            .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.ActivityOccurrenceId));

        // Start time and status of a live occurrence are set by ActivityHistoryService.
        CreateMap<Activity, OccurrenceDto>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.ActivityId, opt => opt.MapFrom(src => src.ActivityId));
    }
}
