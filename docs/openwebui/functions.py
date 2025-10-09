"""
OpenWebUI Function: Family Health Search
Integrates with the EHR PostgreSQL REST API
"""

import requests
from typing import Optional, List
from pydantic import BaseModel, Field

class EventEmitter:
    """OpenWebUI event emitter for status updates"""
    def __init__(self, event_emitter=None):
        self.event_emitter = event_emitter
    
    async def emit(self, description="Unknown State", status="in_progress", done=False):
        if self.event_emitter:
            await self.event_emitter({
                "type": "status",
                "data": {
                    "status": status,
                    "description": description,
                    "done": done,
                },
            })

# Configuration
API_BASE_URL = "https://localhost:8443/api"  # Update with your server URL
API_TOKEN = "your-bearer-token-here"  # If using authentication

class Tools:
    def __init__(self):
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {API_TOKEN}" if API_TOKEN else ""
        }
    
    async def search_family_health(
        self,
        query: str,
        resource_types: Optional[List[str]] = None,
        __event_emitter__=None
    ) -> str:
        """
        Search all family health records by text or medical term.
        
        :param query: Text to search for (e.g., "diabetes", "blood pressure", "medication")
        :param resource_types: Optional list of FHIR resource types to filter 
                              (e.g., ["Condition", "Observation", "MedicationRequest"])
        
        Returns a formatted summary of matching health records across all family members.
        """
        emitter = EventEmitter(__event_emitter__)
        await emitter.emit(f"Searching family health records for: {query}")
        
        try:
            payload = {
                "query": query,
                "page_size": 20
            }
            
            if resource_types:
                payload["resource_types"] = resource_types
            
            response = requests.post(
                f"{API_BASE_URL}/grep",
                json=payload,
                headers=self.headers,
                verify=False  # For self-signed certs
            )
            response.raise_for_status()
            
            results = response.json()
            
            # Format results for LLM consumption
            if not results.get("hits"):
                await emitter.emit("No results found", status="complete", done=True)
                return f"No health records found matching '{query}'"
            
            formatted = f"Found {len(results['hits'])} health records matching '{query}':\n\n"
            
            for i, hit in enumerate(results['hits'][:10], 1):
                formatted += f"{i}. **{hit.get('resourceType', 'Unknown')}**\n"
                formatted += f"   Patient: {hit.get('patient', 'Unknown')}\n"
                formatted += f"   Date: {hit.get('date', 'Unknown')}\n"
                formatted += f"   Details: {hit.get('snippet', 'N/A')}\n\n"
            
            if len(results['hits']) > 10:
                formatted += f"\n_... and {len(results['hits']) - 10} more results_"
            
            await emitter.emit("Search complete", status="complete", done=True)
            return formatted
            
        except Exception as e:
            await emitter.emit(f"Error: {str(e)}", status="error", done=True)
            return f"Error searching health records: {str(e)}"
    
    async def get_patient_timeline(
        self,
        patient_first_name: str,
        limit: int = 20,
        __event_emitter__=None
    ) -> str:
        """
        Get a chronological timeline of health events for a specific family member.
        
        :param patient_first_name: First name of the patient (e.g., "Emmanuel", "Sarah")
        :param limit: Maximum number of recent events to return (default: 20)
        
        Returns a formatted timeline of medical events.
        """
        emitter = EventEmitter(__event_emitter__)
        await emitter.emit(f"Fetching timeline for {patient_first_name}")
        
        try:
            sql = f"""
            SELECT 
                effective_date,
                resource_type,
                code_display,
                status,
                mp.name as provider
            FROM fhir_resources fr
            JOIN patients p ON fr.patient_id = p.id
            JOIN medical_providers mp ON fr.provider_id = mp.id
            WHERE p.first_name ILIKE '{patient_first_name}'
              AND effective_date IS NOT NULL
            ORDER BY effective_date DESC
            LIMIT {limit}
            """
            
            response = requests.post(
                f"{API_BASE_URL}/query",
                json={"sql": sql},
                headers=self.headers,
                verify=False
            )
            response.raise_for_status()
            
            results = response.json()
            
            if not results:
                await emitter.emit("No timeline found", status="complete", done=True)
                return f"No health records found for {patient_first_name}"
            
            formatted = f"**Medical Timeline for {patient_first_name}** (most recent {limit} events):\n\n"
            
            for event in results:
                date = event.get('effective_date', 'Unknown date')
                rtype = event.get('resource_type', 'Unknown')
                desc = event.get('code_display', 'N/A')
                provider = event.get('provider', 'Unknown provider')
                status = event.get('status', '')
                
                icon = {
                    'Condition': '🩺',
                    'Observation': '📊',
                    'MedicationRequest': '💊',
                    'Procedure': '🏥',
                    'Immunization': '💉',
                    'DiagnosticReport': '📋'
                }.get(rtype, '📄')
                
                formatted += f"**{date}** - {icon} {rtype}\n"
                formatted += f"  {desc}"
                if status:
                    formatted += f" ({status})"
                formatted += f"\n  _Provider: {provider}_\n\n"
            
            await emitter.emit("Timeline retrieved", status="complete", done=True)
            return formatted
            
        except Exception as e:
            await emitter.emit(f"Error: {str(e)}", status="error", done=True)
            return f"Error fetching timeline: {str(e)}"
    
    async def find_family_conditions(
        self,
        condition_keyword: str,
        __event_emitter__=None
    ) -> str:
        """
        Find which family members have a specific medical condition.
        
        :param condition_keyword: Medical condition to search for 
                                 (e.g., "diabetes", "asthma", "hypertension")
        
        Returns a summary of family members with the condition.
        """
        emitter = EventEmitter(__event_emitter__)
        await emitter.emit(f"Searching for {condition_keyword} across family")
        
        try:
            sql = f"""
            SELECT 
                p.first_name || ' ' || p.last_name as patient_name,
                p.date_of_birth,
                fr.code_display as condition,
                fr.effective_date,
                fr.status,
                mp.name as diagnosed_by
            FROM fhir_resources fr
            JOIN patients p ON fr.patient_id = p.id
            JOIN medical_providers mp ON fr.provider_id = mp.id
            WHERE fr.resource_type = 'Condition'
              AND fr.searchable_text ILIKE '%{condition_keyword}%'
            ORDER BY p.last_name, fr.effective_date DESC
            """
            
            response = requests.post(
                f"{API_BASE_URL}/query",
                json={"sql": sql},
                headers=self.headers,
                verify=False
            )
            response.raise_for_status()
            
            results = response.json()
            
            if not results:
                await emitter.emit("No conditions found", status="complete", done=True)
                return f"No family members found with '{condition_keyword}'"
            
            # Group by patient
            patients = {}
            for record in results:
                name = record['patient_name']
                if name not in patients:
                    patients[name] = []
                patients[name].append(record)
            
            formatted = f"**Family members with {condition_keyword}:**\n\n"
            
            for name, conditions in patients.items():
                formatted += f"**{name}**\n"
                for cond in conditions:
                    formatted += f"  • {cond['condition']} ({cond['status']})\n"
                    formatted += f"    Diagnosed: {cond['effective_date']}\n"
                    formatted += f"    By: {cond['diagnosed_by']}\n"
                formatted += "\n"
            
            await emitter.emit("Search complete", status="complete", done=True)
            return formatted
            
        except Exception as e:
            await emitter.emit(f"Error: {str(e)}", status="error", done=True)
            return f"Error searching conditions: {str(e)}"
    
    async def get_latest_vitals(
        self,
        patient_first_name: Optional[str] = None,
        __event_emitter__=None
    ) -> str:
        """
        Get the latest vital signs for a patient or all family members.
        
        :param patient_first_name: Optional - specific patient name, or None for all family
        
        Returns latest vitals (blood pressure, heart rate, temperature, etc.)
        """
        emitter = EventEmitter(__event_emitter__)
        await emitter.emit("Fetching latest vitals")
        
        try:
            sql = """
            SELECT 
                p.first_name || ' ' || p.last_name as patient_name,
                mv.code_display as vital_sign,
                mv.value_quantity,
                mv.effective_date,
                mp.name as provider
            FROM mv_latest_vitals mv
            JOIN patients p ON mv.patient_id = p.id
            JOIN medical_providers mp ON mv.provider_id = mp.id
            """
            
            if patient_first_name:
                sql += f" WHERE p.first_name ILIKE '{patient_first_name}'"
            
            sql += " ORDER BY p.last_name, mv.code_display"
            
            response = requests.post(
                f"{API_BASE_URL}/query",
                json={"sql": sql},
                headers=self.headers,
                verify=False
            )
            response.raise_for_status()
            
            results = response.json()
            
            if not results:
                await emitter.emit("No vitals found", status="complete", done=True)
                return "No vital signs data available"
            
            # Group by patient
            patients = {}
            for record in results:
                name = record['patient_name']
                if name not in patients:
                    patients[name] = []
                patients[name].append(record)
            
            formatted = "**Latest Vital Signs:**\n\n"
            
            for name, vitals in patients.items():
                formatted += f"**{name}**\n"
                for vital in vitals:
                    value = vital.get('value_quantity', {})
                    if isinstance(value, dict):
                        val_str = f"{value.get('value', 'N/A')} {value.get('unit', '')}"
                    else:
                        val_str = str(value)
                    
                    formatted += f"  • {vital['vital_sign']}: {val_str}\n"
                    formatted += f"    Measured: {vital['effective_date']} at {vital['provider']}\n"
                formatted += "\n"
            
            await emitter.emit("Vitals retrieved", status="complete", done=True)
            return formatted
            
        except Exception as e:
            await emitter.emit(f"Error: {str(e)}", status="error", done=True)
            return f"Error fetching vitals: {str(e)}"
    
    async def compare_lab_results(
        self,
        test_name: str,
        patient_first_name: Optional[str] = None,
        __event_emitter__=None
    ) -> str:
        """
        Compare lab test results over time or across family members.
        
        :param test_name: Name of the lab test (e.g., "cholesterol", "glucose", "hemoglobin")
        :param patient_first_name: Optional - specific patient, or None for all family
        
        Returns comparison of test results.
        """
        emitter = EventEmitter(__event_emitter__)
        await emitter.emit(f"Comparing {test_name} results")
        
        try:
            sql = f"""
            SELECT 
                p.first_name || ' ' || p.last_name as patient_name,
                fr.code_display as test,
                fr.resource_json->'valueQuantity'->>'value' as value,
                fr.resource_json->'valueQuantity'->>'unit' as unit,
                fr.effective_date,
                mp.name as provider
            FROM fhir_resources fr
            JOIN patients p ON fr.patient_id = p.id
            JOIN medical_providers mp ON fr.provider_id = mp.id
            WHERE fr.resource_type = 'Observation'
              AND fr.category = 'laboratory'
              AND fr.searchable_text ILIKE '%{test_name}%'
            """
            
            if patient_first_name:
                sql += f" AND p.first_name ILIKE '{patient_first_name}'"
            
            sql += " ORDER BY p.last_name, fr.effective_date DESC"
            
            response = requests.post(
                f"{API_BASE_URL}/query",
                json={"sql": sql},
                headers=self.headers,
                verify=False
            )
            response.raise_for_status()
            
            results = response.json()
            
            if not results:
                await emitter.emit("No results found", status="complete", done=True)
                return f"No lab results found for '{test_name}'"
            
            # Group by patient
            patients = {}
            for record in results:
                name = record['patient_name']
                if name not in patients:
                    patients[name] = []
                patients[name].append(record)
            
            formatted = f"**{test_name.title()} Lab Results:**\n\n"
            
            for name, tests in patients.items():
                formatted += f"**{name}**\n"
                for test in tests[:5]:  # Show last 5 results
                    value = test.get('value', 'N/A')
                    unit = test.get('unit', '')
                    formatted += f"  • {test['effective_date']}: {value} {unit}\n"
                    formatted += f"    _{test['provider']}_\n"
                
                if len(tests) > 5:
                    formatted += f"  _... and {len(tests) - 5} more results_\n"
                formatted += "\n"
            
            await emitter.emit("Comparison complete", status="complete", done=True)
            return formatted
            
        except Exception as e:
            await emitter.emit(f"Error: {str(e)}", status="error", done=True)
            return f"Error comparing results: {str(e)}"
