using Microsoft.AspNetCore.Mvc;
using FamilyHealthApi.Models;
using FamilyHealthApi.Services;
using Swashbuckle.AspNetCore.Annotations;

namespace FamilyHealthApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class VitalsController : ControllerBase
{
    private readonly IHealthRecordService _healthRecordService;
    private readonly ILogger<VitalsController> _logger;

    public VitalsController(IHealthRecordService healthRecordService, ILogger<VitalsController> logger)
    {
        _healthRecordService = healthRecordService;
        _logger = logger;
    }

    /// <summary>
    /// Get all vital signs for a patient
    /// </summary>
    /// <param name="patientId">The unique identifier of the patient</param>
    /// <remarks>
    /// Returns vital signs measurements including blood pressure, heart rate, temperature, respiratory rate, oxygen saturation, height, weight, and BMI.
    /// </remarks>
    [HttpGet("{patientId}")]
    [SwaggerOperation(
        OperationId = "get_vital_signs",
        Summary = "Retrieve all vital signs measurements for a patient",
        Description = "Returns a comprehensive list of vital signs including blood pressure, heart rate, temperature, respiratory rate, oxygen saturation, and body measurements."
    )]
    [ProducesResponseType(typeof(IEnumerable<VitalSign>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<VitalSign>>> GetVitalSigns(string patientId)
    {
        try
        {
            var vitals = await _healthRecordService.GetVitalSignsAsync(patientId);
            return Ok(vitals);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving vitals for {PatientId}", patientId);
            return StatusCode(500, "An error occurred while retrieving vital signs");
        }
    }

    /// <summary>
    /// Get latest vital signs for a patient (one per type)
    /// </summary>
    /// <param name="patientId">The unique identifier of the patient</param>
    /// <remarks>
    /// Returns the most recent measurement for each type of vital sign, useful for getting current patient status.
    /// </remarks>
    [HttpGet("{patientId}/latest")]
    [SwaggerOperation(
        OperationId = "get_latest_vitals",
        Summary = "Retrieve the most recent measurement for each vital sign type",
        Description = "Returns the latest value for each vital sign category (blood pressure, heart rate, etc.), showing the patient's current vital status."
    )]
    [ProducesResponseType(typeof(IEnumerable<VitalSign>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<VitalSign>>> GetLatestVitals(string patientId)
    {
        try
        {
            var vitals = await _healthRecordService.GetLatestVitalsAsync(patientId);
            return Ok(vitals);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving latest vitals for {PatientId}", patientId);
            return StatusCode(500, "An error occurred while retrieving latest vital signs");
        }
    }
}
