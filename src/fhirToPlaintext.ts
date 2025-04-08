import { ClientFullEHR } from '../clientTypes'; // Assuming clientTypes is in the parent directory
import _ from 'lodash'; // Ensure lodash is a dependency

/**
 * Creates a FHIR resource renderer function bound to a specific EHR dataset.
 * @param {ClientFullEHR} fullEhr - The complete EHR data (FHIR resources and attachments).
 * @returns {(resource: any) => string} A function that takes a FHIR resource and returns its Markdown representation.
 */
export function createFhirRenderer(fullEhr: ClientFullEHR) {

    // Determine single patient context
    const singlePatientId = (fullEhr.fhir.Patient?.length === 1) ? fullEhr.fhir.Patient[0].id : null;
    const singlePatientRefString = singlePatientId ? `Patient/${singlePatientId}` : null;

    // --- Internal Helper Functions (Now have access to fullEhr via closure) ---

    const renderValue = (value: any) => {
  if (value === null || typeof value === 'undefined') return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    if (value.resourceType) return `[Reference to ${value.resourceType}]`; // Basic fallback for nested resources
    // Add checks for specific FHIR data types if needed, e.g., Quantity, Range
    if (value.value && value.unit) return `${value.value} ${value.unit}`; // Simple Quantity
    if (value.coding || value.text) return renderCodeableConcept(value);
    if (value.system && value.code) return renderCoding(value);
    if (value.start || value.end) return renderPeriod(value);
    if (value.family || value.given) return renderHumanName(value);
    if (value.system && value.value) return renderContactPoint(value); // Or Identifier
    if (value.line || value.city || value.state || value.postalCode) return renderAddress(value);
    // Add more type handlers as needed
  }
  return JSON.stringify(value); // Fallback for unhandled types
};

    const renderCodeableConcept = (cc: any) => {
  if (!cc) return '';
  if (cc.text) return cc.text;
  if (cc.coding && cc.coding.length > 0) {
    return cc.coding.map(renderCoding).filter(Boolean).join('; ') || '';
  }
  return '';
};

    const renderCoding = (coding: any) => {
  if (!coding) return '';
  if (coding.display) return coding.display;
  if (coding.system && coding.code) {
     // Abbreviate common systems for brevity
         const systemMap: { [key: string]: string } = {
        'http://loinc.org': 'LOINC',
        'http://snomed.info/sct': 'SNOMED CT',
        'http://hl7.org/fhir/sid/cvx': 'CVX',
        'http://hl7.org/fhir/sid/ndc': 'NDC',
        'http://unitsofmeasure.org': 'UCUM',
        'urn:oid:2.16.840.1.113883.6.238': 'CDC Race',
        'urn:oid:2.16.840.1.113883.6.300': 'NAIC',
        'urn:oid:2.16.840.1.113883.4.7': 'CLIA',
        'http://hl7.org/fhir/sid/us-npi': 'NPI',
        'http://terminology.hl7.org/CodeSystem/v2-0203': 'HL7 ID Type',
        'http://terminology.hl7.org/CodeSystem/condition-category': 'Cond Cat',
        'http://terminology.hl7.org/CodeSystem/observation-category': 'Obs Cat',
        'http://hl7.org/fhir/us/core/CodeSystem/us-core-category': 'US Core Cat'
      };
      const systemName = systemMap[coding.system] || coding.system;
      return `${systemName} ${coding.code}`;
  }
  return '';
};

    const renderReference = (ref: any) => {
  if (!ref) return '';
      
      // Default to display or reference string if resolution fails or not applicable
      const fallbackDisplay = ref.display || ref.reference || '';
      
      if (ref.reference && typeof ref.reference === 'string') {
          const [resourceType, resourceId] = ref.reference.split('/');
          if (resourceType && resourceId && fullEhr.fhir[resourceType]) {
              const referencedResource = fullEhr.fhir[resourceType].find(r => r.id === resourceId);
              if (referencedResource) {
                  // Attempt to render using the specific reference renderer
                  const summary = renderResourceAsReference(referencedResource);
                  // If summary exists, append the reference string. Otherwise, fallback.
                  if (summary) {
                      return `${summary} (Ref: ${referencedResource.resourceType}/${referencedResource.id})`;
                  } else {
                      // Fallback if specific renderer returned nothing, prioritize original display
                      return ref.display || ref.reference || '[Empty Reference Summary]';
                  }
              } else {
                   // Resource not found in fullEhr
                   // Use display if provided, otherwise the reference string itself
                    return ref.display || ref.reference;
              }
          } else {
             // Not a standard Type/Id format, or type not in fullEhr
              return ref.display || ref.reference; // Use display or the ref string
          }
      } else if (ref.display) {
          // No reference string, but has display
          return ref.display;
      } else if (ref.identifier) {
          // Handle references by identifier if needed (basic example)
          return `[Ref By Identifier: ${renderIdentifier(ref.identifier)}]`;
      }
      
      return fallbackDisplay; // Final fallback
    };

    const renderPeriod = (period: any) => {
  if (!period) return '';
  const start = period.start ? renderDateOrDateTime(period.start) : 'unknown';
  const end = period.end ? renderDateOrDateTime(period.end) : 'present';
  if (!period.start && !period.end) return '';
  if (start === 'unknown' && end === 'present') return ''; // Avoid "unknown - present" if neither is set
  return `${start} to ${end}`;
};

    const renderDateOrDateTime = (dateTimeStr: any) => {
  if (!dateTimeStr) return '';
  try {
    // Attempt to create a date object
    const date = new Date(dateTimeStr);
    // Check if it's just a date (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateTimeStr)) {
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
    // Otherwise, format as date and time
    return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch (e) {
    return dateTimeStr; // Fallback to original string if parsing fails
  }
};

    const renderDate = (dateStr: any) => {
   if (!dateStr) return '';
    try {
        const date = new Date(dateStr + 'T00:00:00Z'); // Ensure it's parsed as UTC date part
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
    } catch (e) {
        return dateStr;
    }
};

    const renderIdentifier = (identifier: any) => {
  if (!identifier) return '';
      let systemName = '';
      if (identifier.system) {
        // Attempt to extract a meaningful name from the URI
        const parts = identifier.system.split(/[:/|]/);
        systemName = parts.pop() || parts.pop() || identifier.system; // Take last non-empty part or full URI
        if (systemName.startsWith('urn:oid:')) {
           systemName = systemName.substring(8); // Remove urn:oid:
        }
      }
      const typeText = identifier.type ? renderCodeableConcept(identifier.type) : '';
  const value = identifier.value || 'Value N/A';
  const period = identifier.period ? ` [${renderPeriod(identifier.period)}]` : '';
      // Prioritize type text if available, otherwise use simplified system name
      const label = typeText ? ` (${typeText})` : (systemName ? ` (${systemName})` : '');

      // Special handling for common identifiers like MRN
      let prefix = '';
      if (typeText?.toLowerCase().includes('medical record') || systemName?.toLowerCase().includes('mrn') || systemName?.toLowerCase().includes('internal') || systemName?.toLowerCase().includes('epi')) {
         prefix = 'MRN: ';
         // Optionally omit label if type clearly indicates MRN
         // label = '';
      }

      return `${prefix}${value}${label}${period}`;
    };

    const renderHumanName = (name: any) => {
  if (!name) return '';
  const given = Array.isArray(name.given) ? name.given.join(' ') : (name.given || '');
  const family = name.family || '';
  const suffix = Array.isArray(name.suffix) ? ' ' + name.suffix.join(' ') : (name.suffix ? ' ' + name.suffix : '');
  const prefix = Array.isArray(name.prefix) ? name.prefix.join(' ') + ' ' : (name.prefix ? name.prefix + ' ' : '');
  const use = name.use ? ` (${name.use})` : '';
  const period = name.period ? ` [${renderPeriod(name.period)}]` : '';
  return `${prefix}${given} ${family}${suffix}${use}${period}`.trim().replace(/\s+/g, ' '); // Normalize spaces
};

    const renderAddress = (address: any) => {
    if (!address) return '';
    const lines = address.line ? address.line.join(', ') : '';
    const city = address.city || '';
    const state = address.state || '';
    const postalCode = address.postalCode || '';
    const country = address.country || '';
    const use = address.use ? ` (${address.use})` : '';
    const period = address.period ? ` [${renderPeriod(address.period)}]` : '';
    let fullAddress = [lines, city, state, postalCode, country].filter(Boolean).join(', ');
    return `${fullAddress}${use}${period}`;
};

    const renderContactPoint = (contact: any) => {
    if (!contact) return '';
    const system = contact.system || '';
    const value = contact.value || '';
    const use = contact.use ? ` (${contact.use})` : '';
    const period = contact.period ? ` [${renderPeriod(contact.period)}]` : '';
    return `${system}: ${value}${use}${period}`;
};

    const renderAttachment = (attachment: any) => {
  if (!attachment) return '';
  const contentType = attachment.contentType || 'unknown type';
  const title = attachment.title ? `"${attachment.title}" ` : '';
  const url = attachment.url ? `(URL: ${attachment.url})` : '';
  const creation = attachment.creation ? ` [Created: ${renderDateOrDateTime(attachment.creation)}]` : '';
  return `${title}(${contentType}) ${url}${creation}`;
};

    const renderExtension = (resource: any, extensionUrl: string, renderFn: (value: any) => string) => {
    const ext = (resource?.extension || []).find(e => e.url === extensionUrl);
    if (!ext) return '';
    // Simple value[x] extension
    if (ext.hasOwnProperty('valueCode') || ext.hasOwnProperty('valueCodeableConcept') || ext.hasOwnProperty('valueBoolean') || ext.hasOwnProperty('valueString') || ext.hasOwnProperty('valueDateTime') || ext.hasOwnProperty('valueQuantity') || ext.hasOwnProperty('valueUri')) {
        const valueKey = Object.keys(ext).find(k => k.startsWith('value'));
        return valueKey ? renderFn(ext[valueKey]) : '';
    }
    // Complex extension - specific logic needed per extension
    // Example for us-core-race / us-core-ethnicity structure
    if (extensionUrl === 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race' ||
        extensionUrl === 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity' ||
        extensionUrl === 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-tribal-affiliation') {
         return renderComplexDemogExtension(ext, renderFn);
    }
    // Add handlers for other complex extensions if needed
    return `[Complex Extension: ${extensionUrl}]`; // Fallback
};

    const renderComplexDemogExtension = (extension: any, renderFn: (value: any) => string): string => {
    if (!extension || !extension.extension) return '';

        // Find the specific category extensions
    const ombExt = extension.extension.filter(e => e.url === 'ombCategory');
    const detailedExt = extension.extension.filter(e => e.url === 'detailed');
        const textExt = extension.extension.find(e => e.url === 'text');

        // Start building the output string parts
        let parts: string[] = []; // Explicitly type parts as string[]
    if (ombExt.length > 0) {
         parts.push(`OMB: ${ombExt.map(e => renderFn(e.valueCoding || e.valueCodeableConcept)).join(', ')}`);
    }
     if (detailedExt.length > 0) {
         parts.push(`Detailed: ${detailedExt.map(e => renderFn(e.valueCoding || e.valueCodeableConcept)).join(', ')}`);
    }
    // Tribal affiliation specific
    const tribalAffiliationExt = extension.extension.find(e => e.url === 'tribalAffiliation');
    const isEnrolledExt = extension.extension.find(e => e.url === 'isEnrolled');
     if (tribalAffiliationExt) {
         parts.push(`Tribe: ${renderFn(tribalAffiliationExt.valueCodeableConcept)}`);
         if(isEnrolledExt) {
            parts.push(`Enrolled: ${isEnrolledExt.valueBoolean ? 'Yes' : 'No'}`);
         }
     }

        // Use the text description if available and no structured parts were found
        if (parts.length === 0 && textExt && textExt.valueString) {
            return textExt.valueString;
        }

    return parts.join('; ');
};

    const renderArray = (arr: any, renderFn: (item: any) => string, separator = ', ') => {
  if (!Array.isArray(arr) || arr.length === 0) return '';
      // Trim whitespace from the separator to avoid leading/trailing spaces on newlines
      const trimmedSeparator = separator.trimStart(); 
      return arr.map(renderFn).filter(Boolean).join(trimmedSeparator);
};

    const renderField = (label: string, value: any, renderFn = renderValue, isArray = false, separator = ', ') => {
  if (value === null || typeof value === 'undefined' || (Array.isArray(value) && value.length === 0)) {
    return '';
  }
      // Pass the potentially modified separator to renderArray
  const renderedValue = isArray ? renderArray(value, renderFn, separator) : renderFn(value);
  if (!renderedValue) return ''; // Don't render if the value rendering is empty
      // Ensure no newline is added before the rendered value if the separator starts with one
      const prefix = separator.startsWith('\n') ? '' : ' '; 
      return `**${label}:**${prefix}${renderedValue}`;
    };

    // --- Concise Reference Renderers ---
    // Functions to generate a short summary string for a referenced resource.

    const renderPatientAsReference = (pt: any): string => {
        return renderHumanName(pt?.name?.[0]) || `Patient/${pt?.id || '?'}`;
    };

    const renderPractitionerAsReference = (pr: any): string => {
        return renderHumanName(pr?.name?.[0]) || `Practitioner/${pr?.id || '?'}`;
    };

    const renderOrganizationAsReference = (org: any): string => {
        return org?.name || `Organization/${org?.id || '?'}`;
    };

    const renderLocationAsReference = (loc: any): string => {
        return loc?.name || `Location/${loc?.id || '?'}`;
    };

    const renderEncounterAsReference = (enc: any): string => {
        const type = renderArray(enc?.type, renderCodeableConcept);
        const classCode = renderCoding(enc?.class);
        const display = type || classCode;
        const period = renderPeriod(enc?.period);
        return display ? `${display}${period ? ` (${period})` : ''}` : `Encounter/${enc?.id || '?'}`;
    };

    const renderConditionAsReference = (cond: any): string => {
        return renderCodeableConcept(cond?.code) || `Condition/${cond?.id || '?'}`;
    };

    const renderObservationAsReference = (obs: any): string => {
        const code = renderCodeableConcept(obs?.code);
        const valueKey = Object.keys(obs || {}).find(k => k.startsWith('value'));
        const value = valueKey ? renderValue(obs[valueKey]) : '';
        // Basic component rendering if no top-level value
        let componentSummary = '';
        if (!value && obs?.component?.length > 0) {
             componentSummary = obs.component.map((c: any) => {
                 const compCode = renderCodeableConcept(c.code);
                 const compValueKey = Object.keys(c || {}).find(k => k.startsWith('value'));
                 const compValue = compValueKey ? renderValue(c[compValueKey]) : '';
                 return `${compCode}: ${compValue || 'N/A'}`;
             }).join('; ');
        }
        const mainPart = code ? `${code}${value ? `: ${value}` : ''}` : `Observation/${obs?.id || '?'}`;
        return componentSummary ? `${mainPart} (${componentSummary})` : mainPart;
    };
    
    const renderMedicationAsReference = (med: any): string => {
       return renderCodeableConcept(med?.code) || `Medication/${med?.id || '?'}`;
    };
    
     const renderMedicationRequestAsReference = (mr: any): string => {
         let medName = '';
         if (mr?.medicationCodeableConcept) medName = renderCodeableConcept(mr.medicationCodeableConcept);
         else if (mr?.medicationReference) medName = mr.medicationReference.display || mr.medicationReference.reference; // Use display first
         return medName ? `${medName} (${mr?.status || 'status?'})` : `MedicationRequest/${mr?.id || '?'}`;
     };

    const renderDefaultAsReference = (res: any): string => {
        // Generic fallback using resource type and ID
        return `${res?.resourceType || 'Resource'}/${res?.id || '?'}`;
    };

    // Map resource types to their concise reference renderers
    const referenceRenderers: { [key: string]: (res: any) => string } = {
        Patient: renderPatientAsReference,
        Practitioner: renderPractitionerAsReference,
        Organization: renderOrganizationAsReference,
        Location: renderLocationAsReference,
        Encounter: renderEncounterAsReference,
        Condition: renderConditionAsReference,
        Observation: renderObservationAsReference,
        Medication: renderMedicationAsReference,
        MedicationRequest: renderMedicationRequestAsReference,
        // Add more as needed
    };

    /**
     * Gets a concise summary string for a given resource, used when rendering references.
     * Dispatches to the appropriate function in referenceRenderers.
     */
    const renderResourceAsReference = (resource: any): string => {
        if (!resource || !resource.resourceType) return '';
        const renderer = referenceRenderers[resource.resourceType] || renderDefaultAsReference;
        try {
            return renderer(resource);
        } catch (e: any) {
            console.error(`[Render] Error in reference renderer for ${resource.resourceType}/${resource.id}:`, e);
            return `${resource.resourceType}/${resource.id} [Render Error]`;
        }
    };

    // --- Resource Templates (Existing implementations moved inside) ---

    const renderPatient = (pt: any): string => {
  if (!pt || pt.resourceType !== 'Patient') return '';
      const output: string[] = [];
  const name = pt.name && pt.name.length > 0 ? renderHumanName(pt.name[0]) : 'No Name Provided';
  output.push(`## Patient: ${name}`);

  // Identifiers (Must Support)
  output.push(renderField('Identifiers', pt.identifier, renderIdentifier, true, '\n  - '));

  // Race (USCDI Requirement via Extension)
  const race = renderExtension(pt, 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race', renderCoding);
  if (race) output.push(`**Race:** ${race}`);

  // Ethnicity (USCDI Requirement via Extension)
  const ethnicity = renderExtension(pt, 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity', renderCoding);
  if (ethnicity) output.push(`**Ethnicity:** ${ethnicity}`);

   // Tribal Affiliation (USCDI Requirement via Extension)
  const tribalAffiliations = (pt.extension || [])
      .filter(e => e.url === 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-tribal-affiliation')
      .map(ext => renderComplexDemogExtension(ext, renderCodeableConcept))
      .filter(Boolean);
  if (tribalAffiliations.length > 0) output.push(renderField('Tribal Affiliation(s)', tribalAffiliations, (item) => item, true, '\n  - '));


  // Birth Sex (Explicit US Core Extension)
      const birthSex = renderExtension(pt, 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-birthsex', 
        (value) => {
            // Handle Coding, CodeableConcept, or simple value
            if (value && typeof value === 'object') {
                if (value.system && value.code) return renderCoding(value);
                if (value.coding || value.text) return renderCodeableConcept(value);
            }
            return renderValue(value); // Fallback for string, code, etc.
        }
      );
  if (birthSex) output.push(`**Birth Sex:** ${birthSex}`);

   // Sex (USCDI Requirement via Extension)
      const sex = renderExtension(pt, 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-sex', 
        (value) => {
            // Handle Coding, CodeableConcept, or simple value
            if (value && typeof value === 'object') {
                if (value.system && value.code) return renderCoding(value);
                if (value.coding || value.text) return renderCodeableConcept(value);
            }
            return renderValue(value); // Fallback for string, code, etc.
        }
      );
  if (sex) output.push(`**Sex (USCDI):** ${sex}`);

   // Sex Parameter for Clinical Use (USCDI Requirement via Extension)
   const spcuExtensions = (pt.extension || [])
       .filter(e => e.url === 'http://hl7.org/fhir/StructureDefinition/patient-sexParameterForClinicalUse');
   if (spcuExtensions.length > 0) {
        const renderedSpcus = spcuExtensions.map(ext => {
             const type = ext.extension?.find(e => e.url === 'type')?.valueCodeableConcept;
             const value = ext.extension?.find(e => e.url === 'value')?.valueCodeableConcept;
             const period = ext.extension?.find(e => e.url === 'period')?.valuePeriod;
             let str = renderCodeableConcept(type);
             if(value) str += `: ${renderCodeableConcept(value)}`;
             if(period) str += ` (${renderPeriod(period)})`;
             return str;
        }).filter(Boolean);
        output.push(renderField('Sex Parameter for Clinical Use', renderedSpcus, (item) => item, true, '\n  - '));
   }


  // Gender Identity (USCDI Requirement via Extension)
  const genderIdentity = renderExtension(pt, 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-genderIdentity', renderCodeableConcept);
  if (genderIdentity) output.push(`**Gender Identity:** ${genderIdentity}`);

    // Pronouns (USCDI Requirement via Extension)
   const pronounExtensions = (pt.extension || [])
        .filter(e => e.url === 'http://hl7.org/fhir/StructureDefinition/individual-pronouns');
   if (pronounExtensions.length > 0) {
        const renderedPronouns = pronounExtensions.map(ext => {
             const value = ext.extension?.find(e => e.url === 'value')?.valueString;
             const use = ext.extension?.find(e => e.url === 'use')?.valueCoding;
             const period = ext.extension?.find(e => e.url === 'period')?.valuePeriod;
             let str = value || '[No Value]';
             if(use) str += ` (${renderCoding(use)})`;
             if(period) str += ` (${renderPeriod(period)})`;
             return str;
        }).filter(Boolean);
        output.push(renderField('Pronouns', renderedPronouns, (item) => item, true, '\n  - '));
   }


  // Names (Must Support name, family, given)
  output.push(renderField('Other Names', pt.name?.slice(1), renderHumanName, true, '\n  - '));
    output.push(renderField('Name Use (Primary)', pt.name?.[0]?.use)); // USCDI
    output.push(renderField('Suffix (Primary)', pt.name?.[0]?.suffix, renderValue, true)); // USCDI
    output.push(renderField('Name Period (Primary)', pt.name?.[0]?.period, renderPeriod)); // USCDI


  // Telecom (USCDI Requirement, must support system, value, use)
  output.push(renderField('Telecom', pt.telecom, renderContactPoint, true, '\n  - '));

  // Gender (Must Support)
  output.push(renderField('Administrative Gender', pt.gender));

  // Birth Date (Must Support)
  output.push(renderField('Birth Date', pt.birthDate, renderDate));

  // Deceased (USCDI Requirement)
  if (pt.deceasedBoolean === true) {
      output.push(`**Deceased:** Yes`);
  } else if (pt.deceasedDateTime) {
      output.push(`**Deceased:** Yes, on ${renderDateOrDateTime(pt.deceasedDateTime)}`);
  } // else implies not deceased or unknown, omit field

  // Address (Must Support address, line, city, state, postalCode)
  output.push(renderField('Addresses', pt.address, renderAddress, true, '\n  - '));
    output.push(renderField('Address Use (Primary)', pt.address?.[0]?.use)); // USCDI
    output.push(renderField('Address Period (Primary)', pt.address?.[0]?.period, renderPeriod)); // USCDI

  // Communication (USCDI Requirement, must support language)
  if (pt.communication && pt.communication.length > 0) {
     const comms = pt.communication.map(comm => {
        let str = renderCodeableConcept(comm.language);
        if (comm.preferred) str += ' (Preferred)';
        return str;
     }).filter(Boolean);
     output.push(renderField('Communication Languages', comms, (item) => item, true, '\n  - '));
  }
    // Interpreter Needed (USCDI Requirement via Extension)
    const interpreterNeeded = renderExtension(pt, 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-interpreter-needed', renderCoding);
    if(interpreterNeeded) output.push(`**Interpreter Needed:** ${interpreterNeeded}`);


      return output.filter(Boolean).join('\n');
};

    const renderAllergyIntolerance = (ai: any): string => {
  if (!ai || ai.resourceType !== 'AllergyIntolerance') return '';
      const output: string[] = [];
  output.push(`## Allergy Intolerance: ${renderCodeableConcept(ai.code)}`);

  output.push(renderField('Clinical Status', renderCodeableConcept(ai.clinicalStatus)));
  output.push(renderField('Verification Status', renderCodeableConcept(ai.verificationStatus)));
      // Filter patient field
      if (!singlePatientRefString || ai.patient?.reference !== singlePatientRefString) {
  output.push(renderField('Patient', renderReference(ai.patient)));
      }

  if (ai.reaction && ai.reaction.length > 0) {
      const reactions = ai.reaction.map(r => {
          const manifestation = renderArray(r.manifestation, renderCodeableConcept);
          return `- Manifestation(s): ${manifestation || 'N/A'}`; // reaction.manifestation is Must Support
      }).join('\n');
      output.push(`**Reactions:**\n${reactions}`);
  }

      return output.filter(Boolean).join('\n');
};

    const renderCondition = (cond: any): string => {
  if (!cond || cond.resourceType !== 'Condition') return '';
      const output: string[] = [];
  output.push(`## Condition: ${renderCodeableConcept(cond.code)}`);

    // Category (Must Support, sliced for US Core problem-list-item | health-concern | encounter-diagnosis)
    output.push(renderField('Categories', cond.category, renderCodeableConcept, true));

  output.push(renderField('Clinical Status', renderCodeableConcept(cond.clinicalStatus)));
  output.push(renderField('Verification Status', renderCodeableConcept(cond.verificationStatus)));
      // Filter patient field
      if (!singlePatientRefString || cond.subject?.reference !== singlePatientRefString) {
  output.push(renderField('Patient', renderReference(cond.subject)));
      }

  // Onset (Must Support)
  const onset = cond.onsetDateTime ? renderDateOrDateTime(cond.onsetDateTime)
              : cond.onsetAge ? renderValue(cond.onsetAge)
              : cond.onsetPeriod ? renderPeriod(cond.onsetPeriod)
              : cond.onsetRange ? renderValue(cond.onsetRange)
              : cond.onsetString || '';
  if (onset) output.push(`**Onset:** ${onset}`);

    // Abatement (Must Support for Problem/Health Concern profile)
    const abatement = cond.abatementDateTime ? renderDateOrDateTime(cond.abatementDateTime)
                  : cond.abatementAge ? renderValue(cond.abatementAge)
                  : cond.abatementPeriod ? renderPeriod(cond.abatementPeriod)
                  : cond.abatementRange ? renderValue(cond.abatementRange)
                  : cond.abatementString || '';
    if (abatement) output.push(`**Abatement:** ${abatement}`);

    // Recorded Date (Must Support)
    output.push(renderField('Recorded Date', cond.recordedDate, renderDateOrDateTime));

    // Asserted Date (Must Support extension for Encounter Diagnosis, Problem/Health Concern)
    const assertedDate = renderExtension(cond, 'http://hl7.org/fhir/StructureDefinition/condition-assertedDate', renderDateOrDateTime);
    if (assertedDate) output.push(`**Asserted Date:** ${assertedDate}`);

    // Encounter (Must Support for Encounter Diagnosis)
    output.push(renderField('Encounter', cond.encounter, renderReference));

    // Last Updated (Must Support meta.lastUpdated for Problem/Health Concern)
     output.push(renderField('Last Updated', cond.meta?.lastUpdated, renderDateOrDateTime));


      return output.filter(Boolean).join('\n');
};

    const renderObservation = (obs: any): string => {
    if (!obs || obs.resourceType !== 'Observation') return '';
      const output: string[] = [];
    output.push(`## Observation: ${renderCodeableConcept(obs.code)}`);

    output.push(renderField('Status', obs.status)); // Must Support in all Observation profiles

    // Category (Must Support in all Observation profiles, sliced)
    output.push(renderField('Categories', obs.category, renderCodeableConcept, true));

       // Filter patient field
      if (!singlePatientRefString || obs.subject?.reference !== singlePatientRefString) {
    output.push(renderField('Patient', renderReference(obs.subject))); // Must Support in all Observation profiles
      }

    // Effective (Must Support in most Observation profiles)
    const effective = obs.effectiveDateTime ? renderDateOrDateTime(obs.effectiveDateTime)
                    : obs.effectivePeriod ? renderPeriod(obs.effectivePeriod)
                    : obs.effectiveTiming ? JSON.stringify(obs.effectiveTiming) // Basic Timing rendering
                    : obs.effectiveInstant ? renderDateOrDateTime(obs.effectiveInstant) : '';
    if (effective) output.push(`**Effective:** ${effective}`);

    // Issued (Must Support for ADI Documentation, Lab)
    output.push(renderField('Issued', obs.issued, renderDateOrDateTime));

    // Performer (Must Support in most Observation profiles)
    output.push(renderField('Performer(s)', obs.performer, renderReference, true));

    // Value (Must Support in most Observation profiles)
    const valueKey = Object.keys(obs).find(k => k.startsWith('value') && k !== 'valueString'); // Prioritize non-string values slightly for rendering
    const valueStringKey = 'valueString';
     if (valueKey && obs[valueKey]) {
        output.push(renderField('Value', obs[valueKey], renderValue));
    } else if (obs[valueStringKey]){
         output.push(renderField('Value', obs[valueStringKey]));
     }


    // Data Absent Reason (Must Support in most Observation profiles)
    output.push(renderField('Data Absent Reason', obs.dataAbsentReason, renderCodeableConcept));

    // Interpretation (Must Support for Lab)
    output.push(renderField('Interpretation', obs.interpretation, renderCodeableConcept, true));

    // Body Site (Must Support for Vitals) - Note: Vitals base profile doesn't enforce MS on bodySite, but specific ones might imply it. Checking general Observation first.
    output.push(renderField('Body Site', obs.bodySite, renderCodeableConcept));

    // Method (Must Support for Vitals)
    output.push(renderField('Method', obs.method, renderCodeableConcept));

    // Specimen (Must Support for Lab)
    output.push(renderField('Specimen', obs.specimen, renderReference));

    // Reference Range (Must Support for Lab)
    if (obs.referenceRange && obs.referenceRange.length > 0) {
        const ranges = obs.referenceRange.map(rr => {
               let parts: string[] = []; // Explicitly type parts as string[]
             if (rr.low) parts.push(`Low: ${renderValue(rr.low)}`);
             if (rr.high) parts.push(`High: ${renderValue(rr.high)}`);
             if (rr.type) parts.push(`Type: ${renderCodeableConcept(rr.type)}`);
             if (rr.appliesTo) parts.push(`Applies To: ${renderArray(rr.appliesTo, renderCodeableConcept)}`);
             if (rr.age) parts.push(`Age: ${renderValue(rr.age)}`); // Range type
             if (rr.text) parts.push(`Text: ${rr.text}`);
             return `- ${parts.join(', ')}`;
        }).join('\n');
        output.push(`**Reference Range(s):**\n${ranges}`);
    }

    // Components (Must Support for Vitals, Average BP, Occupation)
    if (obs.component && obs.component.length > 0) {
        const components = obs.component.map(comp => {
              // Render component code
             let compStr = ` - **${renderCodeableConcept(comp.code)}:** `;
              
              // Find and render component value or dataAbsentReason
             const compValueKey = Object.keys(comp).find(k => k.startsWith('value'));
              if (compValueKey && typeof comp[compValueKey] !== 'undefined' && comp[compValueKey] !== null) {
                 compStr += renderValue(comp[compValueKey]);
             } else if (comp.dataAbsentReason) {
                  compStr += `[Data Absent: ${renderCodeableConcept(comp.dataAbsentReason)}]`;
             } else {
                  compStr += '[No Value]'; // Explicitly state if no value and no reason
             }
              
             // Add interpretation and reference range if present for components
             if(comp.interpretation?.length > 0) compStr += ` (Interpretation: ${renderArray(comp.interpretation, renderCodeableConcept)})`;
              // Slightly simplify reference range rendering for components
              if(comp.referenceRange?.length > 0) {
                  const simplifiedRanges = comp.referenceRange.map(rr => {
                      let rangeParts: string[] = [];
                      if (rr.low) rangeParts.push(`Low: ${renderValue(rr.low)}`);
                      if (rr.high) rangeParts.push(`High: ${renderValue(rr.high)}`);
                      if (rr.text) rangeParts.push(`(${rr.text})`);
                      return rangeParts.join(' ');
                  }).filter(Boolean).join('; ');
                   if (simplifiedRanges) compStr += ` (Ref Range: ${simplifiedRanges})`;
              }

             return compStr;
        }).join('\n');
        output.push(`**Components:**\n${components}`);
    }

    // hasMember (Must Support for Screening/Assessment)
    output.push(renderField('Has Member', obs.hasMember, renderReference, true, '\n  - '));

    // derivedFrom (Must Support for Screening/Assessment)
    output.push(renderField('Derived From', obs.derivedFrom, renderReference, true, '\n  - '));

    // Encounter (Must Support for Clinical Result, Lab)
    output.push(renderField('Encounter', obs.encounter, renderReference));

    // Last Updated (Must Support for Lab)
    output.push(renderField('Last Updated', obs.meta?.lastUpdated, renderDateOrDateTime));

     // Supporting Info (Must Support for ADI Documentation)
     const supportingInfoADI = (obs.extension || [])
         .filter(e => e.url === 'http://hl7.org/fhir/StructureDefinition/workflow-supportingInfo')
         .map(ext => renderReference(ext.valueReference))
         .filter(Boolean);
     if (supportingInfoADI.length > 0) output.push(renderField('Supporting Info (ADI)', supportingInfoADI, (item) => item, true, '\n  - '));

      return output.filter(Boolean).join('\n');
};

    const renderDocumentReference = (dr: any): string => {
    if (!dr || dr.resourceType !== 'DocumentReference') return '';
      const output: string[] = [];
    output.push(`## Document Reference: ${renderCodeableConcept(dr.type)}`);

    output.push(renderField('Identifier(s)', dr.identifier, renderIdentifier, true, '\n  - ')); // Must Support
    output.push(renderField('Status', dr.status)); // Must Support
    output.push(renderField('Categories', dr.category, renderCodeableConcept, true)); // Must Support
       // Filter patient field
      if (!singlePatientRefString || dr.subject?.reference !== singlePatientRefString) {
    output.push(renderField('Patient', renderReference(dr.subject))); // Must Support
      }
    output.push(renderField('Date', dr.date, renderDateOrDateTime)); // Must Support

    // Author (Must Support)
    output.push(renderField('Author(s)', dr.author, renderReference, true));

     // Authenticator (Must Support for ADI)
    output.push(renderField('Authenticator', dr.authenticator, renderReference));

    // Authentication Time (Must Support Extension for ADI)
    const authTime = renderExtension(dr, 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-authentication-time', renderDateOrDateTime);
    if (authTime) output.push(`**Authentication Time:** ${authTime}`);

    // Content (Must Support)
    if (dr.content && dr.content.length > 0) {
        const content = dr.content.map(c => {
             const attachment = renderAttachment(c.attachment); // attachment, contentType, url/data are Must Support
             const format = c.format ? ` (Format: ${renderCoding(c.format)})` : ''; // format is Must Support
             return `- ${attachment}${format}`;
        }).join('\n');
        output.push(`**Content:**\n${content}`);
    }

    // Context (Must Support)
    if (dr.context) {
          let contextParts: string[] = []; // Explicitly type contextParts as string[]
        contextParts.push(renderField('Encounter (Context)', dr.context.encounter, renderReference, true)); // encounter Must Support
        contextParts.push(renderField('Period (Context)', dr.context.period, renderPeriod)); // period Must Support
        const contextStr = contextParts.filter(Boolean).join('\n');
        if (contextStr) output.push(`**Context:**\n${contextStr}`);
    }


      return output.filter(Boolean).join('\n');
}

    const renderMedicationRequest = (mr: any): string => {
    if (!mr || mr.resourceType !== 'MedicationRequest') return '';
      const output: string[] = [];
      // Modify how medName is determined
      let medName = '';
      if (mr.medicationCodeableConcept) {
          medName = renderCodeableConcept(mr.medicationCodeableConcept);
      } else if (mr.medicationReference) {
          // Prioritize display if available on the reference object itself
          medName = mr.medicationReference.display || renderReference(mr.medicationReference); 
      }
      // Fallback if neither is found (should be rare for valid MR)
      if (!medName) medName = '[Unknown Medication]'; 

    output.push(`## Medication Request: ${medName}`);

    output.push(renderField('Status', mr.status)); // Must Support
    output.push(renderField('Intent', mr.intent)); // Must Support
     output.push(renderField('Categories', mr.category, renderCodeableConcept, true)); // Must Support

    // Reported (Must Support)
    const reported = mr.reportedBoolean !== undefined ? (mr.reportedBoolean ? 'Yes' : 'No')
                   : mr.reportedReference ? renderReference(mr.reportedReference) : '';
    if (reported) output.push(`**Reported:** ${reported}`);

       // Filter patient field
      if (!singlePatientRefString || mr.subject?.reference !== singlePatientRefString) {
    output.push(renderField('Patient', renderReference(mr.subject))); // Must Support
      }
    output.push(renderField('Encounter', renderReference(mr.encounter))); // Must Support
    output.push(renderField('Authored On', mr.authoredOn, renderDateOrDateTime)); // Must Support
    output.push(renderField('Requester', renderReference(mr.requester))); // Must Support

    // Reason (USCDI)
    output.push(renderField('Reason Code', mr.reasonCode, renderCodeableConcept, true));
    output.push(renderField('Reason Reference', mr.reasonReference, renderReference, true));

     // Medication Adherence (USCDI via Extension)
     const adherenceExtensions = (mr.extension || [])
       .filter(e => e.url === 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-medication-adherence');
     if (adherenceExtensions.length > 0) {
         const renderedAdherence = adherenceExtensions.map(ext => {
             const adherenceCode = ext.extension?.find(e => e.url === 'medicationAdherence')?.valueCodeableConcept;
             const dateAsserted = ext.extension?.find(e => e.url === 'dateAsserted')?.valueDateTime;
             const infoSource = ext.extension?.find(e => e.url === 'informationSource')?.valueCodeableConcept; // Note: Sliced in profile, just showing first here
             let str = renderCodeableConcept(adherenceCode) || '[No Adherence Code]';
             if(dateAsserted) str += ` (Asserted: ${renderDateOrDateTime(dateAsserted)})`;
             if(infoSource) str += ` (Source: ${renderCodeableConcept(infoSource)})`;
             return str;
         }).filter(Boolean);
         output.push(renderField('Medication Adherence', renderedAdherence, (item) => item, true, '\n  - '));
     }


    // Dosage Instruction (Must Support)
    if (mr.dosageInstruction && mr.dosageInstruction.length > 0) {
        const dosages = mr.dosageInstruction.map(di => {
              let parts: string[] = []; // Explicitly type parts as string[]
             // text (Must Support)
            if(di.text) parts.push(`Instruction: "${di.text}"`);
            // timing (Must Support) - simple rendering
            if (di.timing) parts.push(`Timing: ${JSON.stringify(di.timing)}`);
             // route (Must Support)
            if (di.route) parts.push(`Route: ${renderCodeableConcept(di.route)}`);
             // doseAndRate (Must Support)
            if(di.doseAndRate && di.doseAndRate.length > 0) {
                const dr = di.doseAndRate[0]; // render first one
                const dose = dr.doseRange ? renderValue(dr.doseRange) : renderValue(dr.doseQuantity); // dose[x] Must Support
                if (dose) parts.push(`Dose: ${dose}`);
            }

            return `- ${parts.filter(Boolean).join('; ')}`;
        }).join('\n');
        output.push(`**Dosage Instructions:**\n${dosages}`);
    }


    // Dispense Request (Must Support)
    if (mr.dispenseRequest) {
          let dispenseParts: string[] = []; // Explicitly type dispenseParts as string[]
        // numberOfRepeatsAllowed (Must Support)
        if (mr.dispenseRequest.numberOfRepeatsAllowed !== undefined) dispenseParts.push(`Refills Allowed: ${mr.dispenseRequest.numberOfRepeatsAllowed}`);
        // quantity (Must Support)
        if (mr.dispenseRequest.quantity) dispenseParts.push(`Quantity: ${renderValue(mr.dispenseRequest.quantity)}`);
        // Expected Supply Duration
        if (mr.dispenseRequest.expectedSupplyDuration) dispenseParts.push(`Supply Duration: ${renderValue(mr.dispenseRequest.expectedSupplyDuration)}`);

        const dispenseStr = dispenseParts.join('; ');
        if(dispenseStr) output.push(`**Dispense Request:** ${dispenseStr}`);
    }

      return output.filter(Boolean).join('\n');
};

    // ... (Move ALL other render functions: Procedure, Immunization, etc.) ...

    const renderProcedure = (proc: any): string => {
    if (!proc || proc.resourceType !== 'Procedure') return '';
      const output: string[] = [];
    output.push(`## Procedure: ${renderCodeableConcept(proc.code)}`); // code is Must Support

    output.push(renderField('Status', proc.status)); // Must Support

    // Based On (USCDI)
    output.push(renderField('Based On', proc.basedOn, renderReference, true));

       // Filter patient field
      if (!singlePatientRefString || proc.subject?.reference !== singlePatientRefString) {
    output.push(renderField('Patient', renderReference(proc.subject))); // Must Support
      }

    // Performed (Must Support)
    const performed = proc.performedDateTime ? renderDateOrDateTime(proc.performedDateTime)
                    : proc.performedPeriod ? renderPeriod(proc.performedPeriod)
                    : proc.performedString ? proc.performedString
                    : proc.performedAge ? renderValue(proc.performedAge)
                    : proc.performedRange ? renderValue(proc.performedRange) : '';
    if (performed) output.push(`**Performed:** ${performed}`);

    // Encounter (Must Support)
    output.push(renderField('Encounter', proc.encounter, renderReference));

    // Performer (USCDI)
    if (proc.performer && proc.performer.length > 0) {
        const performers = proc.performer.map(p => {
            let str = renderReference(p.actor); // actor is USCDI
            if (p.function) str += ` (Function: ${renderCodeableConcept(p.function)})`;
            if (p.onBehalfOf) str += ` (On behalf of: ${renderReference(p.onBehalfOf)})`;
            return `- ${str}`;
        }).join('\n');
        output.push(`**Performer(s):**\n${performers}`);
    }

    // Reason (USCDI)
    output.push(renderField('Reason Code', proc.reasonCode, renderCodeableConcept, true));
    output.push(renderField('Reason Reference', proc.reasonReference, renderReference, true));

      return output.filter(Boolean).join('\n');
};

    const renderImmunization = (imm: any): string => {
    if (!imm || imm.resourceType !== 'Immunization') return '';
      const output: string[] = [];
    output.push(`## Immunization: ${renderCodeableConcept(imm.vaccineCode)}`); // vaccineCode is Must Support

    output.push(renderField('Status', imm.status)); // Must Support
    output.push(renderField('Status Reason', imm.statusReason, renderCodeableConcept)); // Must Support

       // Filter patient field
      if (!singlePatientRefString || imm.patient?.reference !== singlePatientRefString) {
    output.push(renderField('Patient', renderReference(imm.patient))); // Must Support
      }

    // Occurrence (Must Support)
     const occurrence = imm.occurrenceDateTime ? renderDateOrDateTime(imm.occurrenceDateTime)
                     : imm.occurrenceString || '';
     if (occurrence) output.push(`**Occurrence:** ${occurrence}`);


    output.push(renderField('Primary Source', imm.primarySource)); // Must Support
    output.push(renderField('Encounter', imm.encounter, renderReference)); // Must Support
    output.push(renderField('Location', renderReference(imm.location))); // Must Support
    output.push(renderField('Lot Number', imm.lotNumber)); // Must Support

    // Performer (Must Support performer, performer.actor)
     if (imm.performer && imm.performer.length > 0) {
        const performers = imm.performer.map(p => {
            let str = renderReference(p.actor); // actor is Must Support
            if (p.function) str += ` (Function: ${renderCodeableConcept(p.function)})`;
            return `- ${str}`;
        }).join('\n');
        output.push(`**Performer(s):**\n${performers}`);
    }


      return output.filter(Boolean).join('\n');
};

    // --- REVISED renderDiagnosticReport ---
    const renderDiagnosticReport = (dr: any): string => {
    if (!dr || dr.resourceType !== 'DiagnosticReport') return '';
      const output: string[] = [];
    output.push(`## Diagnostic Report: ${renderCodeableConcept(dr.code)}`); // code is Must Support

    output.push(renderField('Status', dr.status)); // Must Support

     // Category (Must Support, sliced)
    output.push(renderField('Categories', dr.category, renderCodeableConcept, true));

      // Filter patient field
      if (!singlePatientRefString || dr.subject?.reference !== singlePatientRefString) {
    output.push(renderField('Patient', renderReference(dr.subject))); // Must Support
      }

     // Effective (Must Support)
    const effective = dr.effectiveDateTime ? renderDateOrDateTime(dr.effectiveDateTime)
                    : dr.effectivePeriod ? renderPeriod(dr.effectivePeriod) : '';
    if (effective) output.push(`**Effective:** ${effective}`);

    output.push(renderField('Issued', dr.issued, renderDateOrDateTime)); // Must Support
    output.push(renderField('Encounter', dr.encounter, renderReference)); // Must Support

    // Performer (Must Support)
      output.push(renderField('Performer(s)', dr.performer, renderReference, true, '\n  - ')); // Add list separator

    // Results Interpreter (Must Support)
      output.push(renderField('Results Interpreter(s)', dr.resultsInterpreter, renderReference, true, '\n  - ')); // Add list separator

     // Result (References to Observations) (Must Support)
      // --- MODIFIED RENDERING ---
      if (dr.result && dr.result.length > 0) {
          const resultItems = dr.result.map((ref: any) => {
               // Prioritize the display text directly from the result item
               return ref.display || renderReference(ref.reference) || '[Invalid Result Reference]';
           }).filter(Boolean); // Filter out any potentially empty strings
           // Use renderField with the correct separator for lists
           output.push(renderField('Result(s)', resultItems, (item: string) => item, true, '\n  - '));
      }
      // --- END MODIFIED RENDERING ---

     // Presented Form (Attachment) (Must Support for Note Exchange)
      output.push(renderField('Presented Form', dr.presentedForm, renderAttachment, true, '\n  - ')); // Add list separator

     // Last Updated (Must Support for Lab)
     output.push(renderField('Last Updated', dr.meta?.lastUpdated, renderDateOrDateTime));

      return output.filter(Boolean).join('\n'); // Use standard newline join
};
     // --- END REVISED renderDiagnosticReport ---

    const renderServiceRequest = (sr: any): string => {
     if (!sr || sr.resourceType !== 'ServiceRequest') return '';
      const output: string[] = [];
     output.push(`## Service Request: ${renderCodeableConcept(sr.code)}`); // code is Must Support

     output.push(renderField('Status', sr.status)); // Must Support
     output.push(renderField('Intent', sr.intent)); // Must Support

     // Category (Must Support, sliced)
     output.push(renderField('Categories', sr.category, renderCodeableConcept, true));

       // Filter patient field
      if (!singlePatientRefString || sr.subject?.reference !== singlePatientRefString) {
     output.push(renderField('Patient', renderReference(sr.subject))); // Must Support
      }

     // Occurrence (Must Support)
     const occurrence = sr.occurrenceDateTime ? renderDateOrDateTime(sr.occurrenceDateTime)
                      : sr.occurrencePeriod ? renderPeriod(sr.occurrencePeriod)
                      : sr.occurrenceTiming ? JSON.stringify(sr.occurrenceTiming) : ''; // Basic Timing rendering
     if (occurrence) output.push(`**Occurrence:** ${occurrence}`);

     output.push(renderField('Authored On', sr.authoredOn, renderDateOrDateTime)); // Must Support
     output.push(renderField('Requester', renderReference(sr.requester))); // Must Support
     output.push(renderField('Encounter', renderReference(sr.encounter))); // Must Support

     // Reason (USCDI)
     output.push(renderField('Reason Code', sr.reasonCode, renderCodeableConcept, true));
     output.push(renderField('Reason Reference', sr.reasonReference, renderReference, true));


      return output.filter(Boolean).join('\n');
 };

    const renderDevice = (dev: any): string => {
    if (!dev || dev.resourceType !== 'Device') return '';
      const output: string[] = [];
     const typeName = renderCodeableConcept(dev.type); // type is Must Support
    output.push(`## Implantable Device: ${typeName}`);

    // UDI Carrier (Must Support udiCarrier, deviceIdentifier, carrierHRF)
     if (dev.udiCarrier && dev.udiCarrier.length > 0) {
         const udi = dev.udiCarrier[0]; // Max 1 in profile
           let udiParts: string[] = []; // Explicitly type udiParts as string[]
         if(udi.deviceIdentifier) udiParts.push(`Device Identifier: ${udi.deviceIdentifier}`); // MS
         if(udi.carrierHRF) udiParts.push(`Carrier HRF: ${udi.carrierHRF}`); // MS
         if(udi.issuer) udiParts.push(`Issuer: ${udi.issuer}`);
         if(udi.jurisdiction) udiParts.push(`Jurisdiction: ${udi.jurisdiction}`);
         if(udi.carrierAIDC) udiParts.push(`Carrier AIDC: [Binary Data]`);
         if(udi.entryType) udiParts.push(`Entry Type: ${udi.entryType}`);
          const udiStr = udiParts.join('; ');
         if(udiStr) output.push(`**UDI:** ${udiStr}`);
     }

    output.push(renderField('Distinct Identifier', dev.distinctIdentifier)); // Must Support
    output.push(renderField('Manufacture Date', dev.manufactureDate, renderDateOrDateTime)); // Must Support
    output.push(renderField('Expiration Date', dev.expirationDate, renderDateOrDateTime)); // Must Support
    output.push(renderField('Lot Number', dev.lotNumber)); // Must Support
    output.push(renderField('Serial Number', dev.serialNumber)); // Must Support
       // Filter patient field
      if (!singlePatientRefString || dev.patient?.reference !== singlePatientRefString) {
    output.push(renderField('Patient', renderReference(dev.patient))); // Must Support
      }

      return output.filter(Boolean).join('\n');
 };

    const renderGoal = (goal: any): string => {
     if (!goal || goal.resourceType !== 'Goal') return '';
      const output: string[] = [];
     output.push(`## Goal: ${renderCodeableConcept(goal.description)}`); // description is Must Support

     output.push(renderField('Lifecycle Status', goal.lifecycleStatus)); // Must Support
       // Filter patient field
      if (!singlePatientRefString || goal.subject?.reference !== singlePatientRefString) {
     output.push(renderField('Patient', renderReference(goal.subject))); // Must Support
      }

     // Start (Must Support)
     const start = goal.startDate ? renderDate(goal.startDate)
                  : goal.startCodeableConcept ? renderCodeableConcept(goal.startCodeableConcept) : '';
     if (start) output.push(`**Start:** ${start}`);

     // Target (Must Support target, target.due[x])
     if (goal.target && goal.target.length > 0) {
          const targets = goal.target.map(t => {
               let parts: string[] = []; // Explicitly type parts as string[]
              if (t.measure) parts.push(`Measure: ${renderCodeableConcept(t.measure)}`);
               const detail = t.detailRange ? renderValue(t.detailRange)
                            : t.detailQuantity ? renderValue(t.detailQuantity)
                            : t.detailCodeableConcept ? renderCodeableConcept(t.detailCodeableConcept)
                            : t.detailString ? t.detailString
                            : t.detailBoolean !== undefined ? String(t.detailBoolean)
                            : t.detailInteger !== undefined ? String(t.detailInteger)
                            : t.detailRatio ? renderValue(t.detailRatio) : '';
              if (detail) parts.push(`Detail: ${detail}`);
               const due = t.dueDate ? renderDate(t.dueDate)
                         : t.dueDuration ? renderValue(t.dueDuration) : ''; // due[x] Must Support
               if (due) parts.push(`Due: ${due}`);

               return `- ${parts.filter(Boolean).join('; ')}`;
          }).join('\n');
          output.push(`**Target(s):**\n${targets}`);
     }

     output.push(renderField('Expressed By', renderReference(goal.expressedBy))); // Must Support

      return output.filter(Boolean).join('\n');
 };

    const renderProvenance = (prov: any): string => {
     if (!prov || prov.resourceType !== 'Provenance') return '';
      const output: string[] = [];
     output.push(`## Provenance Record`);

     output.push(renderField('Target(s)', prov.target, renderReference, true, '\n  - ')); // Must Support target, target.reference implicitly
     output.push(renderField('Recorded', prov.recorded, renderDateOrDateTime)); // Must Support

     // Agent (Must Support agent, type, who, onBehalfOf)
     if (prov.agent && prov.agent.length > 0) {
         const agents = prov.agent.map(a => {
             const type = renderCodeableConcept(a.type); // MS
             const who = renderReference(a.who); // MS
             const onBehalfOf = a.onBehalfOf ? ` (On behalf of: ${renderReference(a.onBehalfOf)})` : ''; // MS when applicable
             const role = a.role ? ` (Role: ${renderArray(a.role, renderCodeableConcept)})` : '';
             return `- Type: ${type || 'N/A'}, Who: ${who || 'N/A'}${onBehalfOf}${role}`;
         }).join('\n');
         output.push(`**Agent(s):**\n${agents}`);
     }

      return output.filter(Boolean).join('\n');
 };

    const renderCarePlan = (cp: any): string => {
    if (!cp || cp.resourceType !== 'CarePlan') return '';
      const output: string[] = [];
    const title = cp.title || (cp.category && cp.category.length > 0 ? renderCodeableConcept(cp.category[0]) : 'Care Plan');
    output.push(`## Care Plan: ${title}`);

    // Text (Must Support)
    if (cp.text && cp.text.div) output.push(`**Narrative Status:** ${cp.text.status}\n\n${cp.text.div}`); // Simplified rendering of narrative

    output.push(renderField('Status', cp.status)); // Must Support
    output.push(renderField('Intent', cp.intent)); // Must Support

    // Category (Must Support, sliced for assess-plan)
    output.push(renderField('Categories', cp.category, renderCodeableConcept, true));

       // Filter patient field
      if (!singlePatientRefString || cp.subject?.reference !== singlePatientRefString) {
    output.push(renderField('Patient', renderReference(cp.subject))); // Must Support
      }


      return output.filter(Boolean).join('\n');
};

    const renderCareTeam = (ct: any): string => {
    if (!ct || ct.resourceType !== 'CareTeam') return '';
      const output: string[] = [];
    const name = ct.name || 'Care Team';
    output.push(`## Care Team: ${name}`);

    output.push(renderField('Status', ct.status)); // Must Support
       // Filter patient field
      if (!singlePatientRefString || ct.subject?.reference !== singlePatientRefString) {
    output.push(renderField('Patient', renderReference(ct.subject))); // Must Support
      }

    // Participant (Must Support participant, role, member)
    if (ct.participant && ct.participant.length > 0) {
        const participants = ct.participant.map(p => {
            const role = renderCodeableConcept(p.role); // MS
            const member = renderReference(p.member); // MS
            const onBehalfOf = p.onBehalfOf ? ` (On behalf of: ${renderReference(p.onBehalfOf)})` : '';
            const period = p.period ? ` (${renderPeriod(p.period)})` : '';
            return `- Member: ${member || 'N/A'}, Role: ${role || 'N/A'}${onBehalfOf}${period}`;
        }).join('\n');
        output.push(`**Participant(s):**\n${participants}`);
    }

      return output.filter(Boolean).join('\n');
};

    const renderLocation = (loc: any): string => {
    if (!loc || loc.resourceType !== 'Location') return '';
      const output: string[] = [];
    output.push(`## Location: ${loc.name}`); // name is Must Support

    output.push(renderField('Identifier(s)', loc.identifier, renderIdentifier, true, '\n  - ')); // Must Support
    output.push(renderField('Status', loc.status)); // Must Support
    output.push(renderField('Type(s)', loc.type, renderCodeableConcept, true)); // Must Support
    output.push(renderField('Telecom', loc.telecom, renderContactPoint, true, '\n  - ')); // Must Support
    output.push(renderField('Address', loc.address, renderAddress)); // Must Support address and subfields line, city, state, postalCode
    output.push(renderField('Managing Organization', renderReference(loc.managingOrganization))); // Must Support

      return output.filter(Boolean).join('\n');
};

    const renderOrganization = (org: any): string => {
     if (!org || org.resourceType !== 'Organization') return '';
       const output: string[] = [];
     output.push(`## Organization: ${org.name}`); // name is Must Support

     output.push(renderField('Identifier(s)', org.identifier, renderIdentifier, true, '\n  - ')); // Must Support identifier, system, value (NPI slice MS)
     output.push(renderField('Active', org.active)); // Must Support
     output.push(renderField('Telecom', org.telecom, renderContactPoint, true, '\n  - ')); // Must Support telecom, system, value
     output.push(renderField('Address(es)', org.address, renderAddress, true, '\n  - ')); // Must Support address and subfields line, city, state, postalCode, country

       return output.filter(Boolean).join('\n');
 };

    const renderPractitioner = (pr: any): string => {
     if (!pr || pr.resourceType !== 'Practitioner') return '';
       const output: string[] = [];
     const name = pr.name && pr.name.length > 0 ? renderHumanName(pr.name[0]) : 'No Name Provided'; // name, family Must Support
     output.push(`## Practitioner: ${name}`);

     output.push(renderField('Identifier(s)', pr.identifier, renderIdentifier, true, '\n  - ')); // Must Support identifier, system, value (NPI slice MS)
     output.push(renderField('Other Names', pr.name?.slice(1), renderHumanName, true, '\n  - '));
     output.push(renderField('Telecom', pr.telecom, renderContactPoint, true, '\n  - ')); // Must Support telecom, system, value
     output.push(renderField('Address(es)', pr.address, renderAddress, true, '\n  - ')); // Must Support address and subfields line, city, state, postalCode, country

       return output.filter(Boolean).join('\n');
 };

    const renderPractitionerRole = (pr: any): string => {
     if (!pr || pr.resourceType !== 'PractitionerRole') return '';
       const output: string[] = [];
     output.push(`## Practitioner Role`);

     output.push(renderField('Practitioner', renderReference(pr.practitioner))); // Must Support
     output.push(renderField('Organization', renderReference(pr.organization))); // Must Support
     output.push(renderField('Role(s)', pr.code, renderCodeableConcept, true)); // Must Support
     output.push(renderField('Specialty', pr.specialty, renderCodeableConcept, true)); // Must Support
     output.push(renderField('Location(s)', pr.location, renderReference, true)); // Must Support
     output.push(renderField('Telecom', pr.telecom, renderContactPoint, true, '\n  - ')); // Must Support telecom, system, value
     output.push(renderField('Endpoint(s)', pr.endpoint, renderReference, true)); // Must Support

       return output.filter(Boolean).join('\n');
 };

    const renderRelatedPerson = (rp: any): string => {
     if (!rp || rp.resourceType !== 'RelatedPerson') return '';
       const output: string[] = [];
     const name = rp.name && rp.name.length > 0 ? renderHumanName(rp.name[0]) : ''; // name is Must Support
     const relationship = rp.relationship && rp.relationship.length > 0 ? renderCodeableConcept(rp.relationship[0]) : ''; // relationship is Must Support
     const title = name ? `Related Person: ${name}` : `Related Person: ${relationship || 'Unknown Relationship'}`;
     output.push(`## ${title}`);

     output.push(renderField('Active', rp.active)); // Must Support
        // Filter patient field
       if (!singlePatientRefString || rp.patient?.reference !== singlePatientRefString) {
     output.push(renderField('Patient', renderReference(rp.patient))); // Must Support
       }
     if (relationship && name) output.push(renderField('Relationship', relationship)); // Render if both name and relationship exist
      output.push(renderField('Other Names', rp.name?.slice(1), renderHumanName, true, '\n  - '));
     output.push(renderField('Telecom', rp.telecom, renderContactPoint, true, '\n  - ')); // Must Support
     output.push(renderField('Address(es)', rp.address, renderAddress, true, '\n  - ')); // Must Support

      return output.filter(Boolean).join('\n');
 };

    const renderCoverage = (cov: any): string => {
    if (!cov || cov.resourceType !== 'Coverage') return '';
      const output: string[] = [];
    output.push(`## Coverage`);

    output.push(renderField('Identifier(s)', cov.identifier, renderIdentifier, true, '\n  - ')); // Must Support identifier (Member ID slice MS)
    output.push(renderField('Status', cov.status)); // Must Support
    output.push(renderField('Type', cov.type, renderCodeableConcept)); // Must Support
    output.push(renderField('Subscriber ID', cov.subscriberId)); // Must Support
       // Filter patient field (beneficiary)
      if (!singlePatientRefString || cov.beneficiary?.reference !== singlePatientRefString) {
    output.push(renderField('Beneficiary', renderReference(cov.beneficiary))); // Must Support
      }
    output.push(renderField('Relationship', cov.relationship, renderCodeableConcept)); // Must Support
    output.push(renderField('Period', cov.period, renderPeriod)); // Must Support
    output.push(renderField('Payor(s)', cov.payor, renderReference, true)); // Must Support

    // Class (Must Support class, value, name for group/plan slices)
    if (cov.class && cov.class.length > 0) {
        const classes = cov.class.map(c => {
            const type = renderCodeableConcept(c.type);
            const value = c.value || 'N/A'; // MS
            const name = c.name ? ` (${c.name})` : ''; // MS
            return `- Type: ${type}, Value: ${value}${name}`;
        }).join('\n');
        output.push(`**Class Details:**\n${classes}`);
    }

      return output.filter(Boolean).join('\n');
};

    const renderMedicationDispense = (md: any): string => {
    if (!md || md.resourceType !== 'MedicationDispense') return '';
      const output: string[] = [];
    const medName = md.medicationCodeableConcept ? renderCodeableConcept(md.medicationCodeableConcept) : renderReference(md.medicationReference); // medication[x] is MS
    output.push(`## Medication Dispense: ${medName}`);

    output.push(renderField('Status', md.status)); // Must Support
       // Filter patient field
      if (!singlePatientRefString || md.subject?.reference !== singlePatientRefString) {
    output.push(renderField('Patient', renderReference(md.subject))); // Must Support
      }
    output.push(renderField('Encounter', renderReference(md.context))); // Must Support

     // Performer (Must Support performer, performer.actor)
     if (md.performer && md.performer.length > 0) {
        const performers = md.performer.map(p => {
            let str = renderReference(p.actor); // actor is MS
            return `- ${str}`;
        }).join('\n');
        output.push(`**Performer(s):**\n${performers}`);
    }

    output.push(renderField('Authorizing Prescription(s)', md.authorizingPrescription, renderReference, true)); // Must Support
    output.push(renderField('Type', md.type, renderCodeableConcept)); // Must Support
    output.push(renderField('Quantity', md.quantity, renderValue)); // Must Support
    output.push(renderField('When Handed Over', md.whenHandedOver, renderDateOrDateTime)); // Must Support

    // Dosage Instruction (Must Support)
     if (md.dosageInstruction && md.dosageInstruction.length > 0) {
         const dosages = md.dosageInstruction.map(di => {
               let parts: string[] = []; // Explicitly type parts as string[]
              // text (Must Support)
             if(di.text) parts.push(`Instruction: "${di.text}"`);
             // timing (Must Support) - simple rendering
             if (di.timing) parts.push(`Timing: ${JSON.stringify(di.timing)}`);
              // route (Must Support)
             if (di.route) parts.push(`Route: ${renderCodeableConcept(di.route)}`);
              // doseAndRate (Must Support)
             if(di.doseAndRate && di.doseAndRate.length > 0) {
                 const dr = di.doseAndRate[0]; // render first one
                 const dose = dr.doseRange ? renderValue(dr.doseRange) : renderValue(dr.doseQuantity); // dose[x] Must Support
                 if (dose) parts.push(`Dose: ${dose}`);
             }
             return `- ${parts.filter(Boolean).join('; ')}`;
         }).join('\n');
         output.push(`**Dosage Instructions:**\n${dosages}`);
     }


      return output.filter(Boolean).join('\n');
};

    const renderQuestionnaireResponse = (qr: any): string => {
    if (!qr || qr.resourceType !== 'QuestionnaireResponse') return '';
      const output: string[] = [];

     // Questionnaire (Must Support)
     const questionnaireRef = qr.questionnaire;
     const questionnaireUrlExt = (qr.questionnaire?.extension || []).find(e => e.url === 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-extension-questionnaire-uri'); // MS Extension

     let questionnaireTitle = 'Questionnaire Response';
     if (questionnaireRef) {
         questionnaireTitle = `Response to Questionnaire: ${questionnaireRef}`;
     } else if (questionnaireUrlExt && questionnaireUrlExt.valueUri) {
         questionnaireTitle = `Response to Questionnaire (Non-FHIR): ${questionnaireUrlExt.valueUri}`;
     }
     output.push(`## ${questionnaireTitle}`);


    output.push(renderField('Status', qr.status)); // Must Support
       // Filter patient field
      if (!singlePatientRefString || qr.subject?.reference !== singlePatientRefString) {
    output.push(renderField('Patient', renderReference(qr.subject))); // Must Support
      }
    output.push(renderField('Authored', qr.authored, renderDateOrDateTime)); // Must Support
    output.push(renderField('Author', renderReference(qr.author))); // Must Support

    // Items (Must Support item, linkId, answer.value[x]) - Render recursively or flat for simplicity
      const renderQrItems = (items: any[] | undefined, level = 0): string => {
        if (!items || items.length === 0) return '';
          const itemOutput: string[] = []; // Explicitly type itemOutput as string[]
          const prefix = ' '.repeat(level * 2) + '- ';

        items.forEach(item => {
            const linkId = item.linkId || 'N/A'; // MS
            const text = item.text ? `"${item.text}"` : '';
            let answerStr = '';
            if (item.answer && item.answer.length > 0) {
                 answerStr = item.answer.map(ans => {
                     const valueKey = Object.keys(ans).find(k => k.startsWith('value')); // MS
                     return valueKey ? renderValue(ans[valueKey]) : '[No Value]';
                 }).join(', ');
            }
            itemOutput.push(`${prefix}Item ${linkId} ${text}: ${answerStr || '[No Answer]'}`);
             // Recursively render nested items
            itemOutput.push(renderQrItems(item.item, level + 1));
        });
        return itemOutput.filter(Boolean).join('\n');
    };

    const itemsStr = renderQrItems(qr.item);
    if(itemsStr) output.push(`**Items:**\n${itemsStr}`);


      return output.filter(Boolean).join('\n');
    };

    const renderEncounter = (res: any): string => {
      /* Basic Encounter details */
     if (!res || res.resourceType !== 'Encounter') return '';
        const output: string[] = [];
     const type = renderArray(res.type, renderCodeableConcept);
     const classCode = renderCoding(res.class);
     output.push(`## Encounter: ${type || classCode || 'Encounter'}`);
     output.push(renderField('Identifier(s)', res.identifier, renderIdentifier, true, '\n  - ')); // MS
     output.push(renderField('Status', res.status)); // MS
     output.push(renderField('Class', classCode)); // MS
     output.push(renderField('Type(s)', type)); // MS
         // Filter patient field
        if (!singlePatientRefString || res.subject?.reference !== singlePatientRefString) {
     output.push(renderField('Patient', renderReference(res.subject))); // MS
        }
     output.push(renderField('Period', renderPeriod(res.period))); // MS
        output.push(renderField('Location(s)', res.location, (loc: any) => renderReference(loc.location), true, '\n  - ')); // MS location, location.location
     output.push(renderField('Reason Code', res.reasonCode, renderCodeableConcept, true)); // MS
     output.push(renderField('Reason Reference', res.reasonReference, renderReference, true)); // MS
     output.push(renderField('Discharge Disposition', res.hospitalization?.dischargeDisposition, renderCodeableConcept)); // MS hospitalization, dischargeDisposition
     output.push(renderField('Service Provider', renderReference(res.serviceProvider))); // MS
      // Interpreter Needed (USCDI Requirement via Extension)
     const interpreterNeeded = renderExtension(res, 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-interpreter-needed', renderCoding);
     if(interpreterNeeded) output.push(`**Interpreter Needed:** ${interpreterNeeded}`);
     output.push(renderField('Last Updated', res.meta?.lastUpdated, renderDateOrDateTime)); // MS

     // Participant (MS participant, type, period, individual)
    if (res.participant && res.participant.length > 0) {
        const participants = res.participant.map(p => {
            const type = renderArray(p.type, renderCodeableConcept); // MS
            const individual = renderReference(p.individual); // MS
            const period = renderPeriod(p.period); // MS
            return `- Individual: ${individual || 'N/A'}, Type: ${type || 'N/A'}${period ? ` (${period})` : ''}`;
        }).join('\n');
        output.push(`**Participant(s):**\n${participants}`);
    }


      return output.filter(Boolean).join('\n');
    };

    const renderMedication = (res: any): string => {
      if (!res || res.resourceType !== 'Medication') return '';
      const output: string[] = [];
      output.push(`## Medication: ${renderCodeableConcept(res.code)}`); // MS
      return output.filter(Boolean).join('\n');
    };

    const renderSpecimen = (res: any): string => {
      if (!res || res.resourceType !== 'Specimen') return '';
      const output: string[] = [];
      output.push(`## Specimen: ${renderCodeableConcept(res.type)}`); // MS
      output.push(renderField('Identifier(s)', res.identifier, renderIdentifier, true, '\n  - ')); // MS
      output.push(renderField('Accession Identifier', renderIdentifier(res.accessionIdentifier))); // MS
       // Filter patient field
      if (!singlePatientRefString || res.subject?.reference !== singlePatientRefString) {
          output.push(renderField('Patient', renderReference(res.subject))); // MS
      }
      // Collection Body Site (USCDI)
      output.push(renderField('Collection Body Site', res.collection?.bodySite, renderCodeableConcept));
      // Condition (USCDI)
      output.push(renderField('Specimen Condition(s)', res.condition, renderCodeableConcept, true));

      return output.filter(Boolean).join('\n');
    };

    // --- Template Map (Existing map moved inside) ---
    const templatesForResourceType: { [key: string]: (res: any) => string } = {
      Patient: renderPatient,
      AllergyIntolerance: renderAllergyIntolerance,
      Condition: renderCondition, // Handles both Problem/Health Concern and Encounter Diagnosis via categories
      CarePlan: renderCarePlan,
      CareTeam: renderCareTeam,
      Coverage: renderCoverage,
      Device: renderDevice, // For Implantable Device
      DiagnosticReport: renderDiagnosticReport, // Handles Lab and Note reports via categories
      DocumentReference: renderDocumentReference, // Handles general and ADI via categories/extensions
      Encounter: renderEncounter,
  Goal: renderGoal,
  Immunization: renderImmunization,
  Location: renderLocation,
      Medication: renderMedication,
  MedicationDispense: renderMedicationDispense,
  MedicationRequest: renderMedicationRequest,
  Observation: renderObservation, // Handles Lab, Clinical Result, Vitals (base), Smoking Status, Occupation, Pregnancy Status/Intent, Sexual Orientation, Screening/Assessment, Care Experience/Treatment Intervention Pref, ADI Documentation via categories/codes
  Organization: renderOrganization,
  Practitioner: renderPractitioner,
  PractitionerRole: renderPractitionerRole,
  Procedure: renderProcedure,
  Provenance: renderProvenance,
  QuestionnaireResponse: renderQuestionnaireResponse,
  RelatedPerson: renderRelatedPerson,
  ServiceRequest: renderServiceRequest,
      Specimen: renderSpecimen,
  // Add other US Core resource types here as needed
};

    // --- The Returned Renderer Function ---
/**
     * Renders a single US Core FHIR resource to Markdown using the bound fullEhr data.
 * @param {object} resource - The FHIR resource object.
 * @returns {string} Markdown representation or an error message.
 */
    const renderResource = (resource: any): string => {
        if (!resource || !resource.resourceType || !templatesForResourceType[resource.resourceType]) {
            console.warn(`[Render] Unsupported or invalid resource type: ${resource?.resourceType}`);
            // Try using the reference renderer as a fallback summary
            const summary = renderResourceAsReference(resource);
            return `[Unsupported Resource Type: ${resource?.resourceType || 'Unknown'}]`;
        }
        try {
            return templatesForResourceType[resource.resourceType](resource);
        } catch (error: any) {
            console.error(`[Render] Error rendering ${resource.resourceType}/${resource.id}:`, error);
            return `[Error rendering ${resource.resourceType}/${resource.id}: ${error.message}]`;
        }
    };

    return renderResource; // Return the inner function
}

// Remove old exports
// export const renderResource = (resource: any): string => { ... }; // Remove
// export { templatesForResourceType }; // Remove