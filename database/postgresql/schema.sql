-- PostgreSQL Schema for Multi-Provider Family EHR Data
-- Supports multiple medical providers and patients (family members)
-- Designed to store FHIR resources with proper normalization

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search optimization

-- ============================================================================
-- CORE ENTITIES
-- ============================================================================

-- Medical Providers (Organizations that provide care)
CREATE TABLE medical_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    identifier TEXT UNIQUE NOT NULL, -- e.g., 'epic-scripps', 'kaiser', 'stanford'
    fhir_endpoint TEXT, -- SMART on FHIR endpoint URL
    metadata JSONB DEFAULT '{}', -- Additional provider info
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patients (Family members)
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_role TEXT, -- e.g., 'parent', 'child', 'spouse'
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE,
    metadata JSONB DEFAULT '{}', -- Additional patient info
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patient-Provider Relationships (Many-to-Many)
-- A patient can have records from multiple providers
CREATE TABLE patient_provider_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES medical_providers(id) ON DELETE CASCADE,
    patient_fhir_id TEXT NOT NULL, -- The FHIR Patient ID from this provider
    active BOOLEAN DEFAULT true,
    first_visit_date DATE,
    last_sync_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(patient_id, provider_id)
);

-- ============================================================================
-- FHIR RESOURCES
-- ============================================================================

-- Main FHIR Resources table (normalized)
CREATE TABLE fhir_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Source tracking
    provider_id UUID NOT NULL REFERENCES medical_providers(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    
    -- FHIR identifiers
    resource_type TEXT NOT NULL, -- e.g., 'Observation', 'Condition', 'MedicationRequest'
    resource_id TEXT NOT NULL, -- The FHIR resource ID from the provider
    
    -- Resource content
    resource_json JSONB NOT NULL, -- Full FHIR resource as JSON
    
    -- Common FHIR fields (denormalized for query performance)
    status TEXT, -- e.g., 'final', 'active', 'completed'
    category TEXT, -- e.g., 'laboratory', 'vital-signs'
    code_system TEXT, -- Primary coding system (e.g., 'http://loinc.org')
    code_value TEXT, -- Primary code value (e.g., '8867-4')
    code_display TEXT, -- Human-readable code (e.g., 'Heart rate')
    
    -- Temporal fields
    effective_date DATE, -- When this resource was effective/observed
    issued_at TIMESTAMPTZ, -- When this resource was issued
    
    -- Full-text search
    searchable_text TEXT, -- Concatenated searchable fields
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure uniqueness per provider
    UNIQUE(provider_id, resource_type, resource_id)
);

-- Index for common queries
CREATE INDEX idx_fhir_resources_patient ON fhir_resources(patient_id);
CREATE INDEX idx_fhir_resources_provider ON fhir_resources(provider_id);
CREATE INDEX idx_fhir_resources_type ON fhir_resources(resource_type);
CREATE INDEX idx_fhir_resources_type_patient ON fhir_resources(resource_type, patient_id);
CREATE INDEX idx_fhir_resources_effective_date ON fhir_resources(effective_date DESC NULLS LAST);
CREATE INDEX idx_fhir_resources_code ON fhir_resources(code_system, code_value);

-- GIN index for JSONB queries
CREATE INDEX idx_fhir_resources_json ON fhir_resources USING GIN (resource_json);

-- Full-text search index
CREATE INDEX idx_fhir_resources_search ON fhir_resources USING GIN (to_tsvector('english', searchable_text));
CREATE INDEX idx_fhir_resources_trigram ON fhir_resources USING GIN (searchable_text gin_trgm_ops);

-- ============================================================================
-- ATTACHMENTS
-- ============================================================================

-- FHIR Attachments (PDFs, images, etc.)
CREATE TABLE fhir_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Link to parent resource
    resource_uuid UUID NOT NULL REFERENCES fhir_resources(id) ON DELETE CASCADE,
    
    -- FHIR attachment metadata
    path TEXT NOT NULL, -- JSON path to attachment (e.g., 'content.attachment')
    content_type TEXT NOT NULL, -- MIME type (e.g., 'application/pdf')
    
    -- Content storage
    content_base64 TEXT, -- Base64 encoded binary content
    content_plaintext TEXT, -- Extracted text content
    
    -- Original FHIR attachment JSON
    attachment_json JSONB NOT NULL,
    
    -- Metadata
    file_size_bytes BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(resource_uuid, path)
);

-- Index for attachment queries
CREATE INDEX idx_fhir_attachments_resource ON fhir_attachments(resource_uuid);
CREATE INDEX idx_fhir_attachments_content_type ON fhir_attachments(content_type);

-- Full-text search on attachment plaintext
CREATE INDEX idx_fhir_attachments_text ON fhir_attachments USING GIN (to_tsvector('english', content_plaintext));

-- ============================================================================
-- MATERIALIZED VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Latest vitals for each patient
CREATE MATERIALIZED VIEW mv_latest_vitals AS
SELECT DISTINCT ON (patient_id, code_value)
    patient_id,
    code_value,
    code_display,
    COALESCE(
        -- Simple value (e.g., heart rate, temperature)
        (resource_json->'valueQuantity'->>'value') || ' ' || (resource_json->'valueQuantity'->>'unit'),
        -- Component-based values (e.g., blood pressure)
        (SELECT string_agg(
            (comp->'code'->'coding'->0->>'display') || ': ' || 
            (comp->'valueQuantity'->>'value') || ' ' || 
            (comp->'valueQuantity'->>'unit'), 
            ', ' ORDER BY comp->'code'->'coding'->0->>'display'
        )
        FROM jsonb_array_elements(resource_json->'component') AS comp),
        'No value'
    ) as value_quantity,
    effective_date,
    provider_id
FROM fhir_resources
WHERE resource_type = 'Observation'
  AND category = 'vital-signs'
  AND status = 'final'
ORDER BY patient_id, code_value, effective_date DESC NULLS LAST;

CREATE INDEX idx_mv_latest_vitals_patient ON mv_latest_vitals(patient_id);

-- Active conditions per patient
CREATE MATERIALIZED VIEW mv_active_conditions AS
SELECT 
    patient_id,
    provider_id,
    resource_id,
    code_display,
    resource_json->>'onsetDateTime' as onset_datetime,
    effective_date
FROM fhir_resources
WHERE resource_type = 'Condition'
  AND status = 'active'
ORDER BY patient_id, effective_date DESC NULLS LAST;

CREATE INDEX idx_mv_active_conditions_patient ON mv_active_conditions(patient_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to extract searchable text from FHIR resource
CREATE OR REPLACE FUNCTION extract_searchable_text(resource JSONB)
RETURNS TEXT AS $$
DECLARE
    searchable TEXT;
BEGIN
    searchable := COALESCE(resource->>'text', '') || ' ' ||
                  COALESCE(resource->'code'->>'text', '') || ' ' ||
                  COALESCE(resource->'code'->'coding'->0->>'display', '') || ' ' ||
                  COALESCE(resource->>'display', '') || ' ' ||
                  COALESCE(resource->'subject'->>'display', '');
    RETURN searchable;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to extract primary code from FHIR resource
CREATE OR REPLACE FUNCTION extract_primary_code(resource JSONB)
RETURNS TABLE(code_system TEXT, code_value TEXT, code_display TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (resource->'code'->'coding'->0->>'system')::TEXT,
        (resource->'code'->'coding'->0->>'code')::TEXT,
        (resource->'code'->'coding'->0->>'display')::TEXT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_latest_vitals;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_active_conditions;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_medical_providers_updated_at BEFORE UPDATE ON medical_providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patient_provider_links_updated_at BEFORE UPDATE ON patient_provider_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fhir_resources_updated_at BEFORE UPDATE ON fhir_resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-populate searchable_text on insert/update
CREATE OR REPLACE FUNCTION populate_searchable_text()
RETURNS TRIGGER AS $$
BEGIN
    NEW.searchable_text = extract_searchable_text(NEW.resource_json);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER populate_fhir_resources_searchable_text 
    BEFORE INSERT OR UPDATE ON fhir_resources
    FOR EACH ROW EXECUTE FUNCTION populate_searchable_text();




COMMENT ON TABLE medical_providers IS 'Healthcare organizations that provide medical records';
COMMENT ON TABLE patients IS 'Family members whose records are being stored';
COMMENT ON TABLE patient_provider_links IS 'Links patients to their providers with FHIR IDs';
COMMENT ON TABLE fhir_resources IS 'All FHIR resources (Observations, Conditions, etc.) from all providers';
COMMENT ON TABLE fhir_attachments IS 'Binary attachments (PDFs, images) associated with FHIR resources';
