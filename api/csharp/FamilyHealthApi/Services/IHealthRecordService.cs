using FamilyHealthApi.Models;

namespace FamilyHealthApi.Services;

public interface IHealthRecordService
{
    // Patient queries
    Task<IEnumerable<FamilyMember>> GetAllFamilyMembersAsync();
    Task<PatientSummary?> GetPatientSummaryAsync(string patientId);
    
    // Vital signs
    Task<IEnumerable<VitalSign>> GetVitalSignsAsync(string patientId);
    Task<IEnumerable<VitalSign>> GetLatestVitalsAsync(string patientId);
    
    // Conditions
    Task<IEnumerable<ActiveCondition>> GetActiveConditionsAsync(string? patientId = null);
    Task<IEnumerable<ConditionByCategory>> GetConditionsByCategoryAsync(string? patientId = null);
    Task<IEnumerable<ActiveCondition>> SearchConditionsAsync(string searchTerm);
    
    // Lab results
    Task<IEnumerable<LabResult>> GetLabResultsAsync(string patientId, int limit = 50);
    Task<IEnumerable<LabResult>> GetLatestLabsAsync(string patientId);
    Task<IEnumerable<LabResult>> TrackLabValueAsync(string patientId, string loincCode);
    
    // Medications
    Task<IEnumerable<Medication>> GetMedicationsAsync(string patientId);
    
    // Immunizations
    Task<IEnumerable<Immunization>> GetImmunizationsAsync(string patientId);
    
    // Procedures
    Task<IEnumerable<Procedure>> GetProceduresAsync(string patientId);
    
    // Allergies
    Task<IEnumerable<Allergy>> GetAllergiesAsync(string patientId);
    
    // Providers
    Task<IEnumerable<MedicalProvider>> GetMedicalProvidersAsync();
    
    // Timeline
    Task<IEnumerable<MedicalTimelineEntry>> GetMedicalTimelineAsync(string? patientId = null, int limit = 50);
    
    // Search
    Task<IEnumerable<PatientResource>> SearchResourcesAsync(string searchTerm, int limit = 50);
}
