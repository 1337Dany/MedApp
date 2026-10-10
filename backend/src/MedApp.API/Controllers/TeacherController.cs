using MedApp.Models.Models.Enums;
using MedApp.Services.DTOs.Analytics;
using MedApp.Services.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedApp.API.Controllers;

[Route("api/teacher")]
[Authorize(Roles = nameof(UserRole.Teacher) + "," + nameof(UserRole.Admin))]
public class TeacherController : ApiControllerBase
{
    private readonly ITeacherAnalyticsService _analytics;

    public TeacherController(ITeacherAnalyticsService analytics)
    {
        _analytics = analytics;
    }

    // Aggregated over students who allowed data sharing; nothing is reported for groups below the minimum size.
    [HttpGet("analytics")]
    [ProducesResponseType(typeof(ClassAnalyticsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetAnalytics(CancellationToken ct) =>
        Ok(await _analytics.GetClassAnalyticsAsync(ct));
}
