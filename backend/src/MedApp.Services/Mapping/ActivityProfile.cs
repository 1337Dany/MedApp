using AutoMapper;
using MedApp.Models.Models;
using MedApp.Services.DTOs.Activities;

namespace MedApp.Services.Mapping;

public class ActivityProfile : Profile
{
    public ActivityProfile()
    {
        CreateMap<RecurringOptions, RecurrenceDto>()
            .ForMember(dest => dest.DaysOfWeek,
                opt => opt.MapFrom(src => src.DaysOfWeek.Select(d => d.DayOfWeek).OrderBy(d => d).ToList()));

        CreateMap<Activity, ActivityDto>()
            .ForMember(dest => dest.Id, opt => opt.MapFrom(src => src.ActivityId))
            .ForMember(dest => dest.Recurrence, opt => opt.MapFrom(src => src.RecurringOptions));

        // Owner, subject/topic references, start time and recurrence are set by ActivityService.
        CreateMap<ActivityRequest, Activity>()
            .ForMember(dest => dest.ActivityId, opt => opt.Ignore())
            .ForMember(dest => dest.UserId, opt => opt.Ignore())
            .ForMember(dest => dest.User, opt => opt.Ignore())
            .ForMember(dest => dest.SubjectId, opt => opt.Ignore())
            .ForMember(dest => dest.Subject, opt => opt.Ignore())
            .ForMember(dest => dest.TopicId, opt => opt.Ignore())
            .ForMember(dest => dest.Topic, opt => opt.Ignore())
            .ForMember(dest => dest.StartTime, opt => opt.Ignore())
            .ForMember(dest => dest.ActivityType, opt => opt.Ignore())
            .ForMember(dest => dest.IsRecurring, opt => opt.Ignore())
            .ForMember(dest => dest.RecurringOptionsId, opt => opt.Ignore())
            .ForMember(dest => dest.RecurringOptions, opt => opt.Ignore())
            .ForMember(dest => dest.IsAutoPlanned, opt => opt.Ignore());
    }
}
