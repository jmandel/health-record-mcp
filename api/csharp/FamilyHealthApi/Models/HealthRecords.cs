namespace FamilyHealthApi.Models;

public record FamilyMember(
    string PatientId,
    string FullName,
    string? DateOfBirth,
    int? Age,
    string Gender,
    string? LastVisit,
    int ResourceCount
);

public record VitalSign(
    string PatientId,
    string FullName,
    string Code,
    string Display,
    string Value,
    string? EffectiveDateTime
);

public record ActiveCondition(
    string PatientId,
    string FullName,
    string Code,
    string Display,
    string Status,
    string? OnsetDate,
    string? RecordedDate
);

public record LabResult(
    string PatientId,
    string FullName,
    string Code,
    string Display,
    string Value,
    string? Interpretation,
    string? EffectiveDateTime
);

public record Medication(
    string PatientId,
    string FullName,
    string MedicationCode,
    string MedicationDisplay,
    string Status,
    string? DosageInstruction,
    string? EffectiveDateTime
);

public record Immunization(
    string PatientId,
    string FullName,
    string VaccineCode,
    string VaccineDisplay,
    string Status,
    string? OccurrenceDateTime
);

public record Procedure(
    string PatientId,
    string FullName,
    string Code,
    string Display,
    string Status,
    string? PerformedDate
);

public record Allergy(
    string PatientId,
    string FullName,
    string Code,
    string Display,
    string? Category,
    string? Criticality,
    string? RecordedDate
);

public record MedicalProvider(
    string ProviderId,
    string ProviderName,
    string? ProviderType,
    int PatientCount,
    int ResourceCount,
    string? FirstVisitDate
);

public record PatientResource(
    string ResourceType,
    string ResourceId,
    string? CodeDisplay,
    string? EffectiveDate,
    string? Status
);

public record MedicalTimelineEntry(
    string PatientId,
    string FullName,
    string ResourceType,
    string ResourceId,
    string Description,
    string? EventDate,
    string? Status
);

public record ConditionByCategory(
    string PatientId,
    string FullName,
    string? Category,
    string Display,
    string Status,
    string? EffectiveDate
);

public record PatientSummary(
    string PatientId,
    string FullName,
    int? Age,
    string Gender,
    int ResourceCount,
    int ActiveConditionCount,
    int MedicationCount,
    int LabResultCount,
    string? LastVisit
);
