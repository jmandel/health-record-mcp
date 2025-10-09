using Microsoft.AspNetCore.Mvc;
using FamilyHealthApi.Models;
using FamilyHealthApi.Services;
using Swashbuckle.AspNetCore.Annotations;

namespace FamilyHealthApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class SearchController : ControllerBase
{
    private readonly IHealthRecordService _healthRecordService;
    private readonly ILogger<SearchController> _logger;

    public SearchController(IHealthRecordService healthRecordService, ILogger<SearchController> logger)
    {
        _healthRecordService = healthRecordService;
        _logger = logger;
    }

    /// <summary>
    /// Search all medical resources by keyword
    /// </summary>
    /// <param name="query">Search term to find across all medical resources</param>
    /// <remarks>
    /// Performs a comprehensive search across all medical records including conditions, medications, labs, procedures, and other resources.
    /// </remarks>
    [HttpGet]
    [SwaggerOperation(
        OperationId = "search_all_resources",
        Summary = "Search across all medical resources by keyword",
        Description = "Searches all medical records (conditions, medications, labs, procedures, etc.) for matching text. Returns comprehensive results across all resource types."
    )]
    [ProducesResponseType(typeof(IEnumerable<PatientResource>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<PatientResource>>> Search([FromQuery] string query)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return BadRequest("Search query is required");
            }

            var results = await _healthRecordService.SearchResourcesAsync(query);
            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching with query: {Query}", query);
            return StatusCode(500, "An error occurred while searching");
        }
    }

    /// <summary>
    /// Get full medical timeline (all patients, all resources)
    /// </summary>
    /// <remarks>
    /// Returns a chronological timeline of all medical events across all patients in the system.
    /// </remarks>
    [HttpGet("timeline")]
    [SwaggerOperation(
        OperationId = "get_full_timeline",
        Summary = "Retrieve chronological timeline of all medical events",
        Description = "Returns a time-ordered list of medical events for all patients, including diagnoses, procedures, medications, and other health-related activities."
    )]
    [ProducesResponseType(typeof(IEnumerable<MedicalTimelineEntry>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<MedicalTimelineEntry>>> GetFullTimeline()
    {
        try
        {
            var timeline = await _healthRecordService.GetMedicalTimelineAsync(null);
            return Ok(timeline);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving full timeline");
            return StatusCode(500, "An error occurred while retrieving timeline");
        }
    }
}
