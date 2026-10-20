using MedApp.Models.Models.Enums;

namespace MedApp.Services.DTOs.Activities;

// Body of PATCH /api/activities/{id}/status.
public class ActivityStatusRequest
{
    public Status Status { get; set; }
}
