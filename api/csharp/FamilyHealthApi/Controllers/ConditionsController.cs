using Microsoft.AspNetCore.Mvc;
using FamilyHealthApi.Models;
using FamilyHealthApi.Services;
using Swashbuckle.AspNetCore.Annotations;

namespace FamilyHealthApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class ConditionsController : ControllerBase
{
    private readonly IHealthRecordService _healthRecordService;
    private readonly ILogger<ConditionsController> _logger;

    public ConditionsController(IHealthRecordService healthRecordService, ILogger<ConditionsController> logger)
    {
        _healthRecordService = healthRecordService;
        _logger = logger;
    }

    /// <summary>
    /// Get all active conditions (optionally filter by patient)
    /// </summary>
    /// <param name="patientId">Optional patient ID to filter conditions for a specific patient</param>
    /// <remarks>
    /// Returns active medical conditions and diagnoses. If no patientId is provided, returns conditions for all patients in the system.
    /// </remarks>
    [HttpGet]
    [SwaggerOperation(
        OperationId = "get_active_conditions",
        Summary = "Retrieve active medical conditions",
        Description = "Returns a list of active conditions/diagnoses. Can optionally filter by patient ID. Includes condition name, onset date, category, and clinical status."
    )]
    [ProducesResponseType(typeof(IEnumerable<ActiveCondition>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<ActiveCondition>>> GetActiveConditions([FromQuery] string? patientId = null)
    {
        try
        {
            var conditions = await _healthRecordService.GetActiveConditionsAsync(patientId);
            return Ok(conditions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving active conditions");
            return StatusCode(500, "An error occurred while retrieving conditions");
        }
    }

    /// <summary>
    /// Get conditions grouped by category
    /// </summary>
    /// <param name="patientId">Optional patient ID to filter conditions for a specific patient</param>
    /// <remarks>
    /// Returns conditions organized by clinical category (e.g., cardiovascular, respiratory, endocrine). Useful for understanding the distribution of health issues.
    /// </remarks>
    [HttpGet("by-category")]
    [SwaggerOperation(
        OperationId = "get_conditions_by_category",
        Summary = "Retrieve conditions organized by clinical category",
        Description = "Returns conditions grouped by category type, showing the distribution of health issues across different medical domains. Can optionally filter by patient ID."
    )]
    [ProducesResponseType(typeof(IEnumerable<ConditionByCategory>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<ConditionByCategory>>> GetConditionsByCategory([FromQuery] string? patientId = null)
    {
        try
        {
            var conditions = await _healthRecordService.GetConditionsByCategoryAsync(patientId);
            return Ok(conditions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving conditions by category");
            return StatusCode(500, "An error occurred while retrieving conditions");
        }
    }

    /// <summary>
    /// Search for conditions by keyword
    /// </summary>
    /// <param name="query">Search term to find in condition names or descriptions</param>
    /// <remarks>
    /// Searches conditions by name or description. The search is case-insensitive and matches partial terms.
    /// </remarks>
    [HttpGet("search")]
    [SwaggerOperation(
        OperationId = "search_conditions",
        Summary = "Search for conditions by keyword or phrase",
        Description = "Searches all conditions by name or description using case-insensitive partial matching. Returns matching conditions with full details."
    )]
    [ProducesResponseType(typeof(IEnumerable<ActiveCondition>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<ActiveCondition>>> SearchConditions([FromQuery] string query)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return BadRequest("Search query is required");
            }

            var conditions = await _healthRecordService.SearchConditionsAsync(query);
            return Ok(conditions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching conditions with query: {Query}", query);
            return StatusCode(500, "An error occurred while searching conditions");
        }
    }
}
