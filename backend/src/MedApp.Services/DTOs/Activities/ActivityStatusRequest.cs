using MedApp.Models.Models.Enums;

namespace MedApp.Services.DTOs.Activities;

// Body of PATCH /api/activities/{id}/status.
public class ActivityStatusRequest
{
    public Status Status { get; set; }

    // Start (UTC) of one occurrence of a recurring activity: the status then applies to that occurrence only.
    // Ignored for one-off activities.
    public DateTime? OccurrenceStart { get; set; }
}
