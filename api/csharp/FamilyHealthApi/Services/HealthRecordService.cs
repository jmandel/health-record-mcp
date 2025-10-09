using Npgsql;
using FamilyHealthApi.Models;
using System.Text.Json;

namespace FamilyHealthApi.Services;

public class HealthRecordService : IHealthRecordService
{
    private readonly string _connectionString;
    private readonly ILogger<HealthRecordService> _logger;

    public HealthRecordService(IConfiguration configuration, ILogger<HealthRecordService> logger)
    {
        _connectionString = configuration.GetConnectionString("PostgreSQL") 
            ?? throw new InvalidOperationException("PostgreSQL connection string not found");
        _logger = logger;
    }

    private async Task<NpgsqlConnection> GetConnectionAsync()
    {
        var connection = new NpgsqlConnection(_connectionString);
        await connection.OpenAsync();
        return connection;
    }

    public async Task<IEnumerable<FamilyMember>> GetAllFamilyMembersAsync()
    {
        const string sql = @"
            SELECT 
                p.id::text as patient_id,
                p.first_name || ' ' || p.last_name as full_name,
                p.date_of_birth::text,
                CASE 
                    WHEN p.date_of_birth IS NOT NULL THEN EXTRACT(YEAR FROM AGE(p.date_of_birth))::int
                    ELSE NULL
                END as age,
                COALESCE(p.gender, 'unknown') as gender,
                (SELECT MAX(effective_date)::text FROM fhir_resources WHERE patient_id = p.id) as last_visit,
                (SELECT COUNT(*)::int FROM fhir_resources WHERE patient_id = p.id) as resource_count
            FROM patients p
            ORDER BY p.last_name, p.first_name;";

        await using var conn = await GetConnectionAsync();
        await using var cmd = new NpgsqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync();

        var members = new List<FamilyMember>();
        while (await reader.ReadAsync())
        {
            members.Add(new FamilyMember(
                PatientId: reader.GetString(0),
                FullName: reader.GetString(1),
                DateOfBirth: reader.IsDBNull(2) ? null : reader.GetString(2),
                Age: reader.IsDBNull(3) ? null : reader.GetInt32(3),
                Gender: reader.GetString(4),
                LastVisit: reader.IsDBNull(5) ? null : reader.GetString(5),
                ResourceCount: reader.GetInt32(6)
            ));
        }

        return members;
    }

    public async Task<PatientSummary?> GetPatientSummaryAsync(string patientId)
    {
        const string sql = @"
            SELECT 
                p.id::text as patient_id,
                p.first_name || ' ' || p.last_name as full_name,
                CASE 
                    WHEN p.date_of_birth IS NOT NULL THEN EXTRACT(YEAR FROM AGE(p.date_of_birth))::int
                    ELSE NULL
                END as age,
                COALESCE(p.gender, 'unknown') as gender,
                (SELECT COUNT(*)::int FROM fhir_resources WHERE patient_id = p.id) as resource_count,
                (SELECT COUNT(*)::int FROM fhir_resources WHERE patient_id = p.id AND resource_type = 'Condition' AND status = 'active') as active_condition_count,
                (SELECT COUNT(*)::int FROM fhir_resources WHERE patient_id = p.id AND resource_type = 'MedicationRequest') as medication_count,
                (SELECT COUNT(*)::int FROM fhir_resources WHERE patient_id = p.id AND resource_type = 'Observation' AND category = 'laboratory') as lab_result_count,
                (SELECT MAX(effective_date)::text FROM fhir_resources WHERE patient_id = p.id) as last_visit
            FROM patients p
            WHERE p.id = @patientId::uuid;";

        await using var conn = await GetConnectionAsync();
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@patientId", patientId);
        await using var reader = await cmd.ExecuteReaderAsync();

        if (await reader.ReadAsync())
        {
            return new PatientSummary(
                PatientId: reader.GetString(0),
                FullName: reader.GetString(1),
                Age: reader.IsDBNull(2) ? null : reader.GetInt32(2),
                Gender: reader.GetString(3),
                ResourceCount: reader.GetInt32(4),
                ActiveConditionCount: reader.GetInt32(5),
                MedicationCount: reader.GetInt32(6),
                LabResultCount: reader.GetInt32(7),
                LastVisit: reader.IsDBNull(8) ? null : reader.GetString(8)
            );
        }

        return null;
    }

    public async Task<IEnumerable<VitalSign>> GetVitalSignsAsync(string patientId)
    {
        const string sql = @"
            SELECT 
                p.id::text as patient_id,
                p.first_name || ' ' || p.last_name as full_name,
                COALESCE(fr.code_value, 'Unknown') as code,
                COALESCE(fr.code_display, 'No description') as display,
                COALESCE(
                    fr.value_quantity_value::text || ' ' || fr.value_quantity_unit,
                    -- NOTE: Using normalized 'components' column (extracted by trigger from resource_json).
                    -- This is NOT querying resource_json directly - the trigger pre-populates fr.components.
                    -- JSON operations here are only for formatting multi-value observations (e.g., blood pressure with systolic/diastolic).
                    (SELECT string_agg(
                        (comp->'code'->'coding'->0->>'display') || ': ' || 
                        (comp->'valueQuantity'->>'value') || ' ' || 
                        (comp->'valueQuantity'->>'unit'), 
                        ', ' ORDER BY comp->'code'->'coding'->0->>'display'
                    )
                    FROM jsonb_array_elements(fr.components) AS comp),
                    'No value'
                ) as value,
                fr.effective_date::text
            FROM fhir_resources fr
            JOIN patients p ON fr.patient_id = p.id
            WHERE p.id = @patientId::uuid
              AND fr.resource_type = 'Observation'
              AND fr.category = 'vital-signs'
              AND fr.status = 'final'
            ORDER BY fr.effective_date DESC;";

        await using var conn = await GetConnectionAsync();
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@patientId", patientId);
        await using var reader = await cmd.ExecuteReaderAsync();

        var vitals = new List<VitalSign>();
        while (await reader.ReadAsync())
        {
            vitals.Add(new VitalSign(
                PatientId: reader.GetString(0),
                FullName: reader.GetString(1),
                Code: reader.GetString(2),
                Display: reader.GetString(3),
                Value: reader.GetString(4),
                EffectiveDateTime: reader.IsDBNull(5) ? null : reader.GetString(5)
            ));
        }

        return vitals;
    }

    public async Task<IEnumerable<VitalSign>> GetLatestVitalsAsync(string patientId)
    {
        const string sql = @"
            SELECT DISTINCT ON (fr.code_value)
                p.id::text as patient_id,
                p.first_name || ' ' || p.last_name as full_name,
                COALESCE(fr.code_value, 'Unknown') as code,
                COALESCE(fr.code_display, 'No description') as display,
                COALESCE(
                    fr.value_quantity_value::text || ' ' || fr.value_quantity_unit,
                    -- NOTE: Using normalized 'components' column (extracted by trigger from resource_json).
                    -- This is NOT querying resource_json directly - the trigger pre-populates fr.components.
                    -- JSON operations here are only for formatting multi-value observations (e.g., blood pressure with systolic/diastolic).
                    (SELECT string_agg(
                        (comp->'code'->'coding'->0->>'display') || ': ' || 
                        (comp->'valueQuantity'->>'value') || ' ' || 
                        (comp->'valueQuantity'->>'unit'), 
                        ', ' ORDER BY comp->'code'->'coding'->0->>'display'
                    )
                    FROM jsonb_array_elements(fr.components) AS comp),
                    'No value'
                ) as value,
                fr.effective_date::text
            FROM fhir_resources fr
            JOIN patients p ON fr.patient_id = p.id
            WHERE p.id = @patientId::uuid
              AND fr.resource_type = 'Observation'
              AND fr.category = 'vital-signs'
              AND fr.status = 'final'
            ORDER BY fr.code_value, fr.effective_date DESC;";

        await using var conn = await GetConnectionAsync();
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@patientId", patientId);
        await using var reader = await cmd.ExecuteReaderAsync();

        var vitals = new List<VitalSign>();
        while (await reader.ReadAsync())
        {
            vitals.Add(new VitalSign(
                PatientId: reader.GetString(0),
                FullName: reader.GetString(1),
                Code: reader.GetString(2),
                Display: reader.GetString(3),
                Value: reader.GetString(4),
                EffectiveDateTime: reader.IsDBNull(5) ? null : reader.GetString(5)
            ));
        }

        return vitals;
    }

    public async Task<IEnumerable<ActiveCondition>> GetActiveConditionsAsync(string? patientId = null)
    {
        var sql = @"
            SELECT 
                p.id::text as patient_id,
                p.first_name || ' ' || p.last_name as full_name,
                COALESCE(fr.code_value, 'Unknown') as code,
                COALESCE(fr.code_display, 'No description') as display,
                COALESCE(fr.status, 'unknown') as status,
                COALESCE(fr.onset_datetime::text, fr.recorded_date::text) as onset_date,
                fr.effective_date::text as recorded_date
            FROM fhir_resources fr
            JOIN patients p ON fr.patient_id = p.id
            WHERE fr.resource_type = 'Condition'
              AND (fr.status IS NULL OR fr.status = 'active' OR fr.status = 'unknown')";

        if (!string.IsNullOrEmpty(patientId))
        {
            sql += " AND p.id = @patientId::uuid";
        }

        sql += " ORDER BY p.last_name, fr.effective_date DESC;";

        await using var conn = await GetConnectionAsync();
        await using var cmd = new NpgsqlCommand(sql, conn);
        if (!string.IsNullOrEmpty(patientId))
        {
            cmd.Parameters.AddWithValue("@patientId", patientId);
        }
        await using var reader = await cmd.ExecuteReaderAsync();

        var conditions = new List<ActiveCondition>();
        while (await reader.ReadAsync())
        {
            conditions.Add(new ActiveCondition(
                PatientId: reader.GetString(0),
                FullName: reader.GetString(1),
                Code: reader.GetString(2),
                Display: reader.GetString(3),
                Status: reader.GetString(4),
                OnsetDate: reader.IsDBNull(5) ? null : reader.GetString(5),
                RecordedDate: reader.IsDBNull(6) ? null : reader.GetString(6)
            ));
        }

        return conditions;
    }

    public async Task<IEnumerable<ConditionByCategory>> GetConditionsByCategoryAsync(string? patientId = null)
    {
        var sql = @"
            SELECT 
                p.id::text as patient_id,
                p.first_name || ' ' || p.last_name as full_name,
                fr.category,
                COALESCE(fr.code_display, 'No description') as display,
                COALESCE(fr.status, 'unknown') as status,
                COALESCE(fr.effective_date::text, fr.recorded_date::text, fr.onset_datetime::text) as effective_date
            FROM fhir_resources fr
            JOIN patients p ON fr.patient_id = p.id
            WHERE fr.resource_type = 'Condition'";

        if (!string.IsNullOrEmpty(patientId))
        {
            sql += " AND p.id = @patientId::uuid";
        }

        sql += " ORDER BY p.last_name, fr.category, fr.effective_date DESC NULLS LAST;";

        await using var conn = await GetConnectionAsync();
        await using var cmd = new NpgsqlCommand(sql, conn);
        if (!string.IsNullOrEmpty(patientId))
        {
            cmd.Parameters.AddWithValue("@patientId", patientId);
        }
        await using var reader = await cmd.ExecuteReaderAsync();

        var conditions = new List<ConditionByCategory>();
        while (await reader.ReadAsync())
        {
            conditions.Add(new ConditionByCategory(
                PatientId: reader.GetString(0),
                FullName: reader.GetString(1),
                Category: reader.IsDBNull(2) ? null : reader.GetString(2),
                Display: reader.GetString(3),
                Status: reader.GetString(4),
                EffectiveDate: reader.IsDBNull(5) ? null : reader.GetString(5)
            ));
        }

        return conditions;
    }

    public async Task<IEnumerable<ActiveCondition>> SearchConditionsAsync(string searchTerm)
    {
        const string sql = @"
            SELECT 
                p.id::text as patient_id,
                p.first_name || ' ' || p.last_name as full_name,
                COALESCE(fr.code_value, 'Unknown') as code,
                COALESCE(fr.code_display, 'No description') as display,
                fr.status,
                COALESCE(fr.onset_datetime::text, fr.recorded_date::text) as onset_date,
                fr.effective_date::text as recorded_date
            FROM fhir_resources fr
            JOIN patients p ON fr.patient_id = p.id
            WHERE fr.resource_type = 'Condition'
              AND (
                fr.searchable_text ILIKE @searchTerm
                OR fr.code_display ILIKE @searchTerm
              )
            ORDER BY p.last_name, fr.effective_date DESC;";

        await using var conn = await GetConnectionAsync();
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@searchTerm", $"%{searchTerm}%");
        await using var reader = await cmd.ExecuteReaderAsync();

        var conditions = new List<ActiveCondition>();
        while (await reader.ReadAsync())
        {
            conditions.Add(new ActiveCondition(
                PatientId: reader.GetString(0),
                FullName: reader.GetString(1),
                Code: reader.GetString(2),
                Display: reader.GetString(3),
                Status: reader.GetString(4),
                OnsetDate: reader.IsDBNull(5) ? null : reader.GetString(5),
                RecordedDate: reader.IsDBNull(6) ? null : reader.GetString(6)
            ));
        }

        return conditions;
    }

    public async Task<IEnumerable<LabResult>> GetLabResultsAsync(string patientId, int limit = 50)
    {
        const string sql = @"
            SELECT 
                p.id::text as patient_id,
                p.first_name || ' ' || p.last_name as full_name,
                COALESCE(fr.code_value, 'Unknown') as code,
                COALESCE(fr.code_display, 'No description') as display,
                COALESCE(
                    fr.value_quantity_value::text || ' ' || fr.value_quantity_unit,
                    fr.value_string,
                    fr.value_codeable_concept,
                    -- NOTE: Using normalized 'components' column (extracted by trigger from resource_json).
                    -- This is NOT querying resource_json directly - the trigger pre-populates fr.components.
                    -- JSON operations here are only for formatting multi-value observations (e.g., blood pressure with systolic/diastolic).
                    (SELECT string_agg(
                        (comp->'code'->'coding'->0->>'display') || ': ' || 
                        COALESCE(
                            (comp->'valueQuantity'->>'value') || ' ' || (comp->'valueQuantity'->>'unit'),
                            comp->>'valueString',
                            comp->'valueCodeableConcept'->'coding'->0->>'display'
                        ), 
                        ', ' ORDER BY comp->'code'->'coding'->0->>'display'
                    )
                    FROM jsonb_array_elements(fr.components) AS comp),
                    'No value'
                ) as value,
                fr.interpretation,
                fr.effective_date::text
            FROM fhir_resources fr
            JOIN patients p ON fr.patient_id = p.id
            WHERE p.id = @patientId::uuid
              AND fr.resource_type = 'Observation'
              AND fr.category = 'laboratory'
              AND fr.status = 'final'
            ORDER BY fr.effective_date DESC
            LIMIT @limit;";

        await using var conn = await GetConnectionAsync();
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@patientId", patientId);
        cmd.Parameters.AddWithValue("@limit", limit);
        await using var reader = await cmd.ExecuteReaderAsync();

        var labs = new List<LabResult>();
        while (await reader.ReadAsync())
        {
            labs.Add(new LabResult(
                PatientId: reader.GetString(0),
                FullName: reader.GetString(1),
                Code: reader.GetString(2),
                Display: reader.GetString(3),
                Value: reader.GetString(4),
                Interpretation: reader.IsDBNull(5) ? null : reader.GetString(5),
                EffectiveDateTime: reader.IsDBNull(6) ? null : reader.GetString(6)
            ));
        }

        return labs;
    }

    public async Task<IEnumerable<LabResult>> GetLatestLabsAsync(string patientId)
    {
        const string sql = @"
            SELECT DISTINCT ON (fr.code_value)
                p.id::text as patient_id,
                p.first_name || ' ' || p.last_name as full_name,
                COALESCE(fr.code_value, 'Unknown') as code,
                COALESCE(fr.code_display, 'No description') as display,
                COALESCE(
                    fr.value_quantity_value::text || ' ' || fr.value_quantity_unit,
                    fr.value_string,
                    fr.value_codeable_concept,
                    -- NOTE: Using normalized 'components' column (extracted by trigger from resource_json).
                    -- This is NOT querying resource_json directly - the trigger pre-populates fr.components.
                    -- JSON operations here are only for formatting multi-value observations (e.g., blood pressure with systolic/diastolic).
                    (SELECT string_agg(
                        (comp->'code'->'coding'->0->>'display') || ': ' || 
                        COALESCE(
                            (comp->'valueQuantity'->>'value') || ' ' || (comp->'valueQuantity'->>'unit'),
                            comp->>'valueString',
                            comp->'valueCodeableConcept'->'coding'->0->>'display'
                        ), 
                        ', ' ORDER BY comp->'code'->'coding'->0->>'display'
                    )
                    FROM jsonb_array_elements(fr.components) AS comp),
                    'No value'
                ) as value,
                fr.interpretation,
                fr.effective_date::text
            FROM fhir_resources fr
            JOIN patients p ON fr.patient_id = p.id
            WHERE p.id = @patientId::uuid
              AND fr.resource_type = 'Observation'
              AND fr.category = 'laboratory'
              AND fr.status = 'final'
              AND fr.code_value IS NOT NULL
            ORDER BY fr.code_value, fr.effective_date DESC;";

        await using var conn = await GetConnectionAsync();
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@patientId", patientId);
        await using var reader = await cmd.ExecuteReaderAsync();

        var labs = new List<LabResult>();
        while (await reader.ReadAsync())
        {
            labs.Add(new LabResult(
                PatientId: reader.GetString(0),
                FullName: reader.GetString(1),
                Code: reader.GetString(2),
                Display: reader.GetString(3),
                Value: reader.GetString(4),
                Interpretation: reader.IsDBNull(5) ? null : reader.GetString(5),
                EffectiveDateTime: reader.IsDBNull(6) ? null : reader.GetString(6)
            ));
        }

        return labs;
    }

    public async Task<IEnumerable<LabResult>> TrackLabValueAsync(string patientId, string loincCode)
    {
        const string sql = @"
            SELECT 
                p.id::text as patient_id,
                p.first_name || ' ' || p.last_name as full_name,
                COALESCE(fr.code_value, 'Unknown') as code,
                COALESCE(fr.code_display, 'No description') as display,
                COALESCE(
                    fr.value_quantity_value::text || ' ' || fr.value_quantity_unit,
                    fr.value_string,
                    fr.value_codeable_concept,
                    'See components'
                ) as value,
                fr.interpretation as interpretation,
                fr.effective_date::text
            FROM fhir_resources fr
            JOIN patients p ON fr.patient_id = p.id
            WHERE p.id = @patientId::uuid
              AND fr.resource_type = 'Observation'
              AND fr.code_value = @loincCode
            ORDER BY fr.effective_date DESC;";

        await using var conn = await GetConnectionAsync();
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@patientId", patientId);
        cmd.Parameters.AddWithValue("@loincCode", loincCode);
        await using var reader = await cmd.ExecuteReaderAsync();

        var labs = new List<LabResult>();
        while (await reader.ReadAsync())
        {
            labs.Add(new LabResult(
                PatientId: reader.GetString(0),
                FullName: reader.GetString(1),
                Code: reader.GetString(2),
                Display: reader.GetString(3),
                Value: reader.GetString(4),
                Interpretation: reader.IsDBNull(5) ? null : reader.GetString(5),
                EffectiveDateTime: reader.IsDBNull(6) ? null : reader.GetString(6)
            ));
        }

        return labs;
    }

    public async Task<IEnumerable<Medication>> GetMedicationsAsync(string patientId)
    {
        const string sql = @"
            SELECT 
                p.id::text as patient_id,
                p.first_name || ' ' || p.last_name as full_name,
                fr.code_value as medication_code,
                fr.code_display as medication_display,
                fr.status,
                fr.dosage_instruction as dosage_instruction,
                fr.effective_date::text
            FROM fhir_resources fr
            JOIN patients p ON fr.patient_id = p.id
            WHERE p.id = @patientId::uuid
              AND fr.resource_type = 'MedicationRequest'
            ORDER BY fr.effective_date DESC;";

        await using var conn = await GetConnectionAsync();
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@patientId", patientId);
        await using var reader = await cmd.ExecuteReaderAsync();

        var medications = new List<Medication>();
        while (await reader.ReadAsync())
        {
            medications.Add(new Medication(
                PatientId: reader.GetString(0),
                FullName: reader.GetString(1),
                MedicationCode: reader.GetString(2),
                MedicationDisplay: reader.GetString(3),
                Status: reader.GetString(4),
                DosageInstruction: reader.IsDBNull(5) ? null : reader.GetString(5),
                EffectiveDateTime: reader.IsDBNull(6) ? null : reader.GetString(6)
            ));
        }

        return medications;
    }

    public async Task<IEnumerable<Immunization>> GetImmunizationsAsync(string patientId)
    {
        const string sql = @"
            SELECT 
                p.id::text as patient_id,
                p.first_name || ' ' || p.last_name as full_name,
                fr.code_value as vaccine_code,
                fr.code_display as vaccine_display,
                fr.status,
                fr.effective_date::text
            FROM fhir_resources fr
            JOIN patients p ON fr.patient_id = p.id
            WHERE p.id = @patientId::uuid
              AND fr.resource_type = 'Immunization'
            ORDER BY fr.effective_date DESC;";

        await using var conn = await GetConnectionAsync();
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@patientId", patientId);
        await using var reader = await cmd.ExecuteReaderAsync();

        var immunizations = new List<Immunization>();
        while (await reader.ReadAsync())
        {
            immunizations.Add(new Immunization(
                PatientId: reader.GetString(0),
                FullName: reader.GetString(1),
                VaccineCode: reader.GetString(2),
                VaccineDisplay: reader.GetString(3),
                Status: reader.GetString(4),
                OccurrenceDateTime: reader.IsDBNull(5) ? null : reader.GetString(5)
            ));
        }

        return immunizations;
    }

    public async Task<IEnumerable<Procedure>> GetProceduresAsync(string patientId)
    {
        const string sql = @"
            SELECT 
                p.id::text as patient_id,
                p.first_name || ' ' || p.last_name as full_name,
                COALESCE(fr.code_value, 'Unknown') as code,
                COALESCE(fr.code_display, 'No description') as display,
                fr.status,
                fr.effective_date::text
            FROM fhir_resources fr
            JOIN patients p ON fr.patient_id = p.id
            WHERE p.id = @patientId::uuid
              AND fr.resource_type = 'Procedure'
            ORDER BY fr.effective_date DESC;";

        await using var conn = await GetConnectionAsync();
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@patientId", patientId);
        await using var reader = await cmd.ExecuteReaderAsync();

        var procedures = new List<Procedure>();
        while (await reader.ReadAsync())
        {
            procedures.Add(new Procedure(
                PatientId: reader.GetString(0),
                FullName: reader.GetString(1),
                Code: reader.GetString(2),
                Display: reader.GetString(3),
                Status: reader.GetString(4),
                PerformedDate: reader.IsDBNull(5) ? null : reader.GetString(5)
            ));
        }

        return procedures;
    }

    public async Task<IEnumerable<Allergy>> GetAllergiesAsync(string patientId)
    {
        const string sql = @"
            SELECT 
                p.id::text as patient_id,
                p.first_name || ' ' || p.last_name as full_name,
                COALESCE(fr.code_value, 'Unknown') as code,
                COALESCE(fr.code_display, 'No description') as display,
                fr.category,
                fr.criticality as criticality,
                fr.effective_date::text
            FROM fhir_resources fr
            JOIN patients p ON fr.patient_id = p.id
            WHERE p.id = @patientId::uuid
              AND fr.resource_type = 'AllergyIntolerance'
            ORDER BY fr.effective_date DESC;";

        await using var conn = await GetConnectionAsync();
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@patientId", patientId);
        await using var reader = await cmd.ExecuteReaderAsync();

        var allergies = new List<Allergy>();
        while (await reader.ReadAsync())
        {
            allergies.Add(new Allergy(
                PatientId: reader.GetString(0),
                FullName: reader.GetString(1),
                Code: reader.GetString(2),
                Display: reader.GetString(3),
                Category: reader.IsDBNull(4) ? null : reader.GetString(4),
                Criticality: reader.IsDBNull(5) ? null : reader.GetString(5),
                RecordedDate: reader.IsDBNull(6) ? null : reader.GetString(6)
            ));
        }

        return allergies;
    }

    public async Task<IEnumerable<MedicalProvider>> GetMedicalProvidersAsync()
    {
        const string sql = @"
            SELECT 
                mp.id as provider_id,
                mp.name as provider_name,
                (mp.resource_json->'type'->0->'coding'->0->>'display')::text as provider_type,
                (SELECT COUNT(*)::int FROM patient_provider_links WHERE provider_id = mp.id) as patient_count,
                (SELECT COUNT(*)::int FROM fhir_resources WHERE provider_id = mp.id) as resource_count,
                (SELECT MIN(first_visit_date)::text FROM patient_provider_links WHERE provider_id = mp.id) as first_visit_date
            FROM medical_providers mp
            ORDER BY mp.name;";

        await using var conn = await GetConnectionAsync();
        await using var cmd = new NpgsqlCommand(sql, conn);
        await using var reader = await cmd.ExecuteReaderAsync();

        var providers = new List<MedicalProvider>();
        while (await reader.ReadAsync())
        {
            providers.Add(new MedicalProvider(
                ProviderId: reader.GetString(0),
                ProviderName: reader.GetString(1),
                ProviderType: reader.IsDBNull(2) ? null : reader.GetString(2),
                PatientCount: reader.GetInt32(3),
                ResourceCount: reader.GetInt32(4),
                FirstVisitDate: reader.IsDBNull(5) ? null : reader.GetString(5)
            ));
        }

        return providers;
    }

    public async Task<IEnumerable<MedicalTimelineEntry>> GetMedicalTimelineAsync(string? patientId = null, int limit = 50)
    {
        var sql = @"
            SELECT 
                p.id::text as patient_id,
                p.first_name || ' ' || p.last_name as full_name,
                fr.resource_type,
                fr.resource_id,
                COALESCE(fr.code_display, fr.resource_type || ' (no description)') as description,
                fr.effective_date::text,
                fr.status
            FROM fhir_resources fr
            JOIN patients p ON fr.patient_id = p.id";

        if (!string.IsNullOrEmpty(patientId))
        {
            sql += " WHERE p.id = @patientId::uuid";
        }

        sql += " ORDER BY fr.effective_date DESC NULLS LAST LIMIT @limit;";

        await using var conn = await GetConnectionAsync();
        await using var cmd = new NpgsqlCommand(sql, conn);
        if (!string.IsNullOrEmpty(patientId))
        {
            cmd.Parameters.AddWithValue("@patientId", patientId);
        }
        cmd.Parameters.AddWithValue("@limit", limit);
        await using var reader = await cmd.ExecuteReaderAsync();

        var timeline = new List<MedicalTimelineEntry>();
        while (await reader.ReadAsync())
        {
            timeline.Add(new MedicalTimelineEntry(
                PatientId: reader.GetString(0),
                FullName: reader.GetString(1),
                ResourceType: reader.GetString(2),
                ResourceId: reader.GetString(3),
                Description: reader.GetString(4),
                EventDate: reader.IsDBNull(5) ? null : reader.GetString(5),
                Status: reader.IsDBNull(6) ? null : reader.GetString(6)
            ));
        }

        return timeline;
    }

    public async Task<IEnumerable<PatientResource>> SearchResourcesAsync(string searchTerm, int limit = 50)
    {
        const string sql = @"
            SELECT 
                fr.resource_type,
                fr.resource_id,
                fr.code_display,
                fr.effective_date::text,
                fr.status
            FROM fhir_resources fr
            WHERE fr.searchable_text @@ plainto_tsquery('english', @searchTerm)
               OR fr.code_display ILIKE @wildcardTerm
            ORDER BY fr.effective_date DESC NULLS LAST
            LIMIT @limit;";

        await using var conn = await GetConnectionAsync();
        await using var cmd = new NpgsqlCommand(sql, conn);
        cmd.Parameters.AddWithValue("@searchTerm", searchTerm);
        cmd.Parameters.AddWithValue("@wildcardTerm", $"%{searchTerm}%");
        cmd.Parameters.AddWithValue("@limit", limit);
        await using var reader = await cmd.ExecuteReaderAsync();

        var resources = new List<PatientResource>();
        while (await reader.ReadAsync())
        {
            resources.Add(new PatientResource(
                ResourceType: reader.GetString(0),
                ResourceId: reader.GetString(1),
                CodeDisplay: reader.IsDBNull(2) ? null : reader.GetString(2),
                EffectiveDate: reader.IsDBNull(3) ? null : reader.GetString(3),
                Status: reader.IsDBNull(4) ? null : reader.GetString(4)
            ));
        }

        return resources;
    }
}
