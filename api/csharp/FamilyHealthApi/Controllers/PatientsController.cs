using Microsoft.AspNetCore.Mvc;
using FamilyHealthApi.Models;
using FamilyHealthApi.Services;
using Swashbuckle.AspNetCore.Annotations;

namespace FamilyHealthApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class PatientsController : ControllerBase
{
    private readonly IHealthRecordService _healthRecordService;
    private readonly ILogger<PatientsController> _logger;

    public PatientsController(IHealthRecordService healthRecordService, ILogger<PatientsController> logger)
    {
        _healthRecordService = healthRecordService;
        _logger = logger;
    }

    /// <summary>
    /// Get all family members
    /// </summary>
    /// <remarks>
    /// Returns a list of all patients/family members in the health record system with basic demographic information.
    /// </remarks>
    [HttpGet]
    [SwaggerOperation(
        OperationId = "get_all_patients",
        Summary = "Retrieve all family members in the health record system",
        Description = "Returns a list of all patients with basic information including ID, name, date of birth, age, gender, and family role."
    )]
    [ProducesResponseType(typeof(IEnumerable<FamilyMember>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<FamilyMember>>> GetAllPatients()
    {
        try
        {
            var patients = await _healthRecordService.GetAllFamilyMembersAsync();
            return Ok(patients);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving all patients");
            return StatusCode(500, "An error occurred while retrieving patients");
        }
    }

    /// <summary>
    /// Get patient summary by ID
    /// </summary>
    /// <param name="patientId">The unique identifier of the patient</param>
    /// <remarks>
    /// Returns comprehensive summary information for a specific patient including demographics and record counts.
    /// </remarks>
    [HttpGet("{patientId}/summary")]
    [SwaggerOperation(
        OperationId = "get_patient_summary",
        Summary = "Retrieve comprehensive summary for a patient",
        Description = "Returns detailed patient information including demographics, total counts of conditions, medications, labs, vitals, allergies, immunizations, and procedures."
    )]
    [ProducesResponseType(typeof(PatientSummary), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PatientSummary>> GetPatientSummary(string patientId)
    {
        try
        {
            var summary = await _healthRecordService.GetPatientSummaryAsync(patientId);
            if (summary == null)
            {
                return NotFound($"Patient with ID '{patientId}' not found");
            }
            return Ok(summary);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving patient summary for {PatientId}", patientId);
            return StatusCode(500, "An error occurred while retrieving patient summary");
        }
    }

    /// <summary>
    /// Get medical timeline for a patient
    /// </summary>
    /// <param name="patientId">The unique identifier of the patient</param>
    /// <remarks>
    /// Returns a chronological timeline of all medical events including conditions, procedures, medications, and other significant health events.
    /// </remarks>
    [HttpGet("{patientId}/timeline")]
    [SwaggerOperation(
        OperationId = "get_medical_timeline",
        Summary = "Retrieve chronological medical timeline for a patient",
        Description = "Returns a time-ordered list of medical events including diagnoses, procedures, medications, and other health-related activities."
    )]
    [ProducesResponseType(typeof(IEnumerable<MedicalTimelineEntry>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<MedicalTimelineEntry>>> GetTimeline(string patientId)
    {
        try
        {
            var timeline = await _healthRecordService.GetMedicalTimelineAsync(patientId);
            return Ok(timeline);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving timeline for {PatientId}", patientId);
            return StatusCode(500, "An error occurred while retrieving timeline");
        }
    }

    /// <summary>
    /// Get all medications for a patient
    /// </summary>
    /// <param name="patientId">The unique identifier of the patient</param>
    /// <remarks>
    /// Returns all medication records including active prescriptions and medication history with dosage instructions.
    /// </remarks>
    [HttpGet("{patientId}/medications")]
    [SwaggerOperation(
        OperationId = "get_medications",
        Summary = "Retrieve all medications for a patient",
        Description = "Returns a list of medications including prescription details, dosage instructions, and medication status."
    )]
    [ProducesResponseType(typeof(IEnumerable<Medication>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<Medication>>> GetMedications(string patientId)
    {
        try
        {
            var medications = await _healthRecordService.GetMedicationsAsync(patientId);
            return Ok(medications);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving medications for {PatientId}", patientId);
            return StatusCode(500, "An error occurred while retrieving medications");
        }
    }

    /// <summary>
    /// Get all immunizations for a patient
    /// </summary>
    /// <param name="patientId">The unique identifier of the patient</param>
    /// <remarks>
    /// Returns vaccination history including vaccine names, dates administered, and immunization status.
    /// </remarks>
    [HttpGet("{patientId}/immunizations")]
    [SwaggerOperation(
        OperationId = "get_immunizations",
        Summary = "Retrieve immunization history for a patient",
        Description = "Returns a list of all vaccinations received by the patient, including vaccine names, administration dates, and status."
    )]
    [ProducesResponseType(typeof(IEnumerable<Immunization>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<Immunization>>> GetImmunizations(string patientId)
    {
        try
        {
            var immunizations = await _healthRecordService.GetImmunizationsAsync(patientId);
            return Ok(immunizations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving immunizations for {PatientId}", patientId);
            return StatusCode(500, "An error occurred while retrieving immunizations");
        }
    }

    /// <summary>
    /// Get all procedures for a patient
    /// </summary>
    /// <param name="patientId">The unique identifier of the patient</param>
    /// <remarks>
    /// Returns medical procedures performed on the patient including procedure names, dates, and descriptions.
    /// </remarks>
    [HttpGet("{patientId}/procedures")]
    [SwaggerOperation(
        OperationId = "get_procedures",
        Summary = "Retrieve medical procedures for a patient",
        Description = "Returns a list of medical procedures performed, including procedure names, dates, status, and related documentation."
    )]
    [ProducesResponseType(typeof(IEnumerable<Procedure>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<Procedure>>> GetProcedures(string patientId)
    {
        try
        {
            var procedures = await _healthRecordService.GetProceduresAsync(patientId);
            return Ok(procedures);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving procedures for {PatientId}", patientId);
            return StatusCode(500, "An error occurred while retrieving procedures");
        }
    }

    /// <summary>
    /// Get all allergies for a patient
    /// </summary>
    /// <param name="patientId">The unique identifier of the patient</param>
    /// <remarks>
    /// Returns allergy and intolerance information including allergens, reactions, severity, and criticality.
    /// </remarks>
    [HttpGet("{patientId}/allergies")]
    [SwaggerOperation(
        OperationId = "get_allergies",
        Summary = "Retrieve allergy and intolerance information for a patient",
        Description = "Returns a list of known allergies and intolerances, including the allergen, type of reaction, severity, and clinical criticality."
    )]
    [ProducesResponseType(typeof(IEnumerable<Allergy>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<Allergy>>> GetAllergies(string patientId)
    {
        try
        {
            var allergies = await _healthRecordService.GetAllergiesAsync(patientId);
            return Ok(allergies);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving allergies for {PatientId}", patientId);
            return StatusCode(500, "An error occurred while retrieving allergies");
        }
    }
}
