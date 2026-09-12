using Microsoft.AspNetCore.Mvc;

namespace DBHub.Api.Controllers;

[ApiController]
public class HealthController : ControllerBase
{
    [HttpGet("/health")]
    [HttpGet("/api/health")]
    public IActionResult GetHealth()
    {
        return Ok(new
        {
            status = "Healthy",
            timestamp = DateTime.UtcNow,
            version = "1.0.0-phase2"
        });
    }
}
