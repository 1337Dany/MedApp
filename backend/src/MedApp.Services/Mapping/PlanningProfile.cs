using AutoMapper;
using MedApp.Services.DTOs.Planning;
using MedApp.Services.Planning;

namespace MedApp.Services.Mapping;

public class PlanningProfile : Profile
{
    public PlanningProfile()
    {
        CreateMap<PlanningWarning, PlanningWarningDto>();
    }
}
