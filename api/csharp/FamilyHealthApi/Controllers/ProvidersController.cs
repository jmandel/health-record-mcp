using Microsoft.AspNetCore.Mvc;
using FamilyHealthApi.Models;
using FamilyHealthApi.Services;
using Swashbuckle.AspNetCore.Annotations;

namespace FamilyHealthApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class ProvidersController : ControllerBase
{
    private readonly IHealthRecordService _healthRecordService;
    private readonly ILogger<ProvidersController> _logger;

    public ProvidersController(IHealthRecordService healthRecordService, ILogger<ProvidersController> logger)
    {
        _healthRecordService = healthRecordService;
        _logger = logger;
    }

    /// <summary>
    /// Get all medical providers
    /// </summary>
    /// <remarks>
    /// Returns a list of all healthcare providers in the system including doctors, nurses, clinics, and hospitals.
    /// </remarks>
    [HttpGet]
    [SwaggerOperation(
        OperationId = "get_medical_providers",
        Summary = "Retrieve all healthcare providers",
        Description = "Returns a list of medical providers including names, specialties, contact information, and organizational affiliations."
    )]
    [ProducesResponseType(typeof(IEnumerable<MedicalProvider>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<MedicalProvider>>> GetProviders()
    {
        try
        {
            var providers = await _healthRecordService.GetMedicalProvidersAsync();
            return Ok(providers);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving medical providers");
            return StatusCode(500, "An error occurred while retrieving providers");
        }
    }
}
