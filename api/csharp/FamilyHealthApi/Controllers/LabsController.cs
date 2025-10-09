using Microsoft.AspNetCore.Mvc;
using FamilyHealthApi.Models;
using FamilyHealthApi.Services;
using Swashbuckle.AspNetCore.Annotations;

namespace FamilyHealthApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class LabsController : ControllerBase
{
    private readonly IHealthRecordService _healthRecordService;
    private readonly ILogger<LabsController> _logger;

    public LabsController(IHealthRecordService healthRecordService, ILogger<LabsController> logger)
    {
        _healthRecordService = healthRecordService;
        _logger = logger;
    }

    /// <summary>
    /// Get all lab results for a patient
    /// </summary>
    /// <param name="patientId">The unique identifier of the patient</param>
    /// <remarks>
    /// Retrieves all laboratory test results for the specified patient, ordered by date (most recent first).
    /// </remarks>
    [HttpGet("{patientId}")]
    [SwaggerOperation(
        OperationId = "get_lab_results",
        Summary = "Retrieve laboratory test results for a patient",
        Description = "Returns all lab results including test names, values, units, reference ranges, and interpretations. Results are ordered by date with most recent first."
    )]
    [ProducesResponseType(typeof(IEnumerable<LabResult>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<LabResult>>> GetLabResults(string patientId)
    {
        try
        {
            var labs = await _healthRecordService.GetLabResultsAsync(patientId);
            return Ok(labs);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving lab results for {PatientId}", patientId);
            return StatusCode(500, "An error occurred while retrieving lab results");
        }
    }

    /// <summary>
    /// Get latest lab results for a patient (one per test type)
    /// </summary>
    /// <param name="patientId">The unique identifier of the patient</param>
    /// <remarks>
    /// Returns the most recent result for each unique lab test type, useful for getting current status across all tests.
    /// </remarks>
    [HttpGet("{patientId}/latest")]
    [SwaggerOperation(
        OperationId = "get_latest_labs",
        Summary = "Retrieve the most recent result for each lab test type",
        Description = "Returns the latest lab result for each unique test (identified by LOINC code), showing the patient's current status across all laboratory tests."
    )]
    [ProducesResponseType(typeof(IEnumerable<LabResult>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<LabResult>>> GetLatestLabs(string patientId)
    {
        try
        {
            var labs = await _healthRecordService.GetLatestLabsAsync(patientId);
            return Ok(labs);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving latest labs for {PatientId}", patientId);
            return StatusCode(500, "An error occurred while retrieving latest lab results");
        }
    }

    /// <summary>
    /// Track a specific lab value over time by LOINC code
    /// </summary>
    /// <param name="patientId">The unique identifier of the patient</param>
    /// <param name="loincCode">The LOINC code identifying the lab test (e.g., '2339-0' for Glucose, '2571-8' for Triglycerides)</param>
    /// <remarks>
    /// LOINC (Logical Observation Identifiers Names and Codes) is a universal standard for identifying laboratory and clinical observations.
    /// This endpoint returns all historical results for a specific test, useful for tracking trends over time.
    /// Common LOINC codes include:
    /// - 2339-0: Glucose
    /// - 2571-8: Triglycerides  
    /// - 2085-9: Cholesterol HDL
    /// - 2093-3: Cholesterol Total
    /// - 718-7: Hemoglobin
    /// </remarks>
    [HttpGet("{patientId}/track/{loincCode}")]
    [SwaggerOperation(
        OperationId = "track_lab_value",
        Summary = "Track historical values for a specific lab test using LOINC code",
        Description = "Returns all results for a specific laboratory test identified by its LOINC code, ordered chronologically. LOINC codes are universal standard identifiers for lab tests (e.g., '2339-0' for Glucose)."
    )]
    [ProducesResponseType(typeof(IEnumerable<LabResult>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<LabResult>>> TrackLabValue(string patientId, string loincCode)
    {
        try
        {
            var labs = await _healthRecordService.TrackLabValueAsync(patientId, loincCode);
            return Ok(labs);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error tracking lab value {LoincCode} for {PatientId}", loincCode, patientId);
            return StatusCode(500, "An error occurred while tracking lab value");
        }
    }
}
