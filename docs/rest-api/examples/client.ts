#!/usr/bin/env bun
// Example REST API client demonstrating how to use the EHR Search API

const BASE_URL = 'https://localhost:8443';

// Replace with your actual access token from OAuth flow
const ACCESS_TOKEN = process.env.EHR_API_TOKEN || 'YOUR_TOKEN_HERE';

const headers = {
    'Authorization': `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
};

async function makeRequest(method: string, path: string, body?: any) {
    const url = `${BASE_URL}${path}`;
    console.log(`\n${method} ${path}`);
    
    try {
        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            // Accept self-signed certificates in development
            // @ts-ignore
            rejectUnauthorized: false
        });

        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType?.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            console.error(`Error ${response.status}:`, data);
            return null;
        }

        return data;
    } catch (error) {
        console.error(`Request failed:`, error);
        return null;
    }
}

async function main() {
    console.log('=== EHR Search REST API Demo ===\n');

    // 1. Health Check
    console.log('\n--- 1. Health Check ---');
    const health = await makeRequest('GET', '/api/health');
    console.log('Health:', health);

    // 2. Search for diabetes-related records
    console.log('\n--- 2. Search for Diabetes ---');
    const grepResult = await makeRequest('POST', '/api/grep', {
        query: 'diabetes|diabetic',
        resource_types: ['Condition', 'Observation'],
        resource_format: 'plaintext',
        page_size: 3,
        page: 1
    });
    if (grepResult) {
        console.log(grepResult.substring(0, 500) + '...\n[truncated]');
    }

    // 3. Query for all patients
    console.log('\n--- 3. SQL Query for Patients ---');
    const queryResult = await makeRequest('POST', '/api/query', {
        sql: 'SELECT json FROM fhir_resources WHERE resource_type = "Patient" LIMIT 1'
    });
    if (queryResult) {
        console.log('Query result:', JSON.stringify(queryResult, null, 2).substring(0, 300) + '...');
    }

    // 4. Execute custom JavaScript
    console.log('\n--- 4. Custom JavaScript Evaluation ---');
    const evalResult = await makeRequest('POST', '/api/eval', {
        code: `
            const patient = (fullEhr.fhir['Patient'] || [])[0];
            const conditions = fullEhr.fhir['Condition'] || [];
            const observations = fullEhr.fhir['Observation'] || [];
            
            console.log('Analyzing patient record...');
            
            return {
                patientName: patient?.name?.[0]?.text || 'Unknown',
                patientId: patient?.id,
                resourceCounts: {
                    conditions: conditions.length,
                    observations: observations.length
                }
            };
        `
    });
    if (evalResult) {
        console.log('Eval result:', JSON.stringify(evalResult, null, 2));
    }

    // 5. Get a specific resource (example - will fail if resource doesn't exist)
    console.log('\n--- 5. Get Specific Resource ---');
    const resourceResult = await makeRequest('GET', '/api/resource/Patient/example-id');
    if (resourceResult) {
        console.log('Resource:', JSON.stringify(resourceResult, null, 2).substring(0, 200) + '...');
    }

    console.log('\n=== Demo Complete ===');
    console.log('\nNote: Set EHR_API_TOKEN environment variable with your OAuth token');
    console.log('Example: export EHR_API_TOKEN="your-token-here"');
}

main().catch(console.error);
