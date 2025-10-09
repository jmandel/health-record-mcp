// OpenAPI 3.0 specification for EHR Search REST API
export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'EHR Search REST API',
    version: '1.0.0',
    description: 'REST API for searching and querying patient EHR data using SMART on FHIR. Provides the same tools as the MCP server but via standard REST endpoints.',
    contact: {
      name: 'API Support'
    }
  },
  servers: [
    {
      url: 'https://localhost:8443',
      description: 'Local development server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'OAuth 2.0 Bearer token obtained via the OAuth flow'
      }
    },
    schemas: {
      GrepRequest: {
        type: 'object',
        required: ['query'],
        properties: {
          query: {
            type: 'string',
            description: 'Text string or JavaScript-style regular expression to search for (case-insensitive)',
            example: 'diabetes|diabetic'
          },
          resource_types: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional list of FHIR resource types to filter (e.g., ["Condition", "Observation"]) or ["Attachment"] for attachments only',
            example: ['Condition', 'Observation']
          },
          resource_format: {
            type: 'string',
            enum: ['plaintext', 'json'],
            default: 'plaintext',
            description: 'Output format for matching resources'
          },
          page_size: {
            type: 'integer',
            minimum: 1,
            maximum: 50,
            default: 50,
            description: 'Number of results per page'
          },
          page: {
            type: 'integer',
            minimum: 1,
            default: 1,
            description: 'Page number to retrieve'
          }
        }
      },
      QueryRequest: {
        type: 'object',
        required: ['sql'],
        properties: {
          sql: {
            type: 'string',
            description: 'Read-only SQL SELECT statement to execute against FHIR data',
            example: 'SELECT json FROM fhir_resources WHERE resource_type = "Patient"'
          }
        }
      },
      EvalRequest: {
        type: 'object',
        required: ['code'],
        properties: {
          code: {
            type: 'string',
            description: 'JavaScript function body to execute against the patient record. Has access to fullEhr, console, lodash (_), and Buffer.',
            example: 'const conditions = fullEhr.fhir["Condition"] || []; return { count: conditions.length };'
          }
        }
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error code or message'
          },
          error_description: {
            type: 'string',
            description: 'Detailed error description'
          }
        }
      }
    }
  },
  security: [
    { bearerAuth: [] }
  ],
  paths: {
    '/api/grep': {
      post: {
        operationId: 'search_ehr_with_text_or_regex',
        summary: 'Search EHR records with text or regex',
        description: 'Performs text or regular expression searches across all parts of the fetched record (structured FHIR data + text from notes/attachments). Returns paginated results with context snippets.',
        tags: ['Search'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/GrepRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Search results in Markdown format',
            content: {
              'text/markdown': {
                schema: { type: 'string' }
              }
            }
          },
          '401': {
            description: 'Unauthorized - missing or invalid bearer token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/query': {
      post: {
        operationId: 'execute_sql_query_on_fhir_data',
        summary: 'Execute SQL query on FHIR data',
        description: 'Executes read-only SQL SELECT queries directly against the structured FHIR data. Resources are stored in the fhir_resources table with columns: resource_type, resource_id, json.',
        tags: ['Query'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/QueryRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Query results as JSON',
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    {
                      type: 'array',
                      items: { type: 'object' }
                    },
                    {
                      type: 'object',
                      properties: {
                        warning: { type: 'string' },
                        error: { type: 'string' },
                        truncated_results: {
                          type: 'array',
                          items: { type: 'object' }
                        }
                      }
                    }
                  ]
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/eval': {
      post: {
        operationId: 'execute_javascript_against_patient_record',
        summary: 'Execute custom JavaScript code',
        description: 'Executes custom JavaScript code directly on the fetched data (FHIR resources + attachments). Offers maximum flexibility for complex calculations and custom formatting.',
        tags: ['Eval'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/EvalRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Execution results',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    result: {
                      description: 'The result returned by the executed code'
                    },
                    logs: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Console output from execution'
                    },
                    errors: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Any errors encountered during execution'
                    }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/resource/{resourceType}/{resourceId}': {
      get: {
        operationId: 'get_fhir_resource_by_type_and_id',
        summary: 'Get a specific FHIR resource',
        description: 'Retrieve the complete FHIR JSON for a specific resource by type and ID.',
        tags: ['Resources'],
        parameters: [
          {
            name: 'resourceType',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'FHIR resource type',
            example: 'Patient'
          },
          {
            name: 'resourceId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Resource ID',
            example: 'example-id'
          }
        ],
        responses: {
          '200': {
            description: 'FHIR resource',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    resource: {
                      type: 'object',
                      description: 'The FHIR resource, or null if not found'
                    },
                    error: {
                      type: 'string',
                      description: 'Error message if resource not found'
                    }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/attachment/{resourceType}/{resourceId}': {
      get: {
        operationId: 'get_attachment_plaintext_content',
        summary: 'Get attachment content',
        description: 'Retrieve the full plaintext content of a specific attachment by resource reference and path.',
        tags: ['Attachments'],
        parameters: [
          {
            name: 'resourceType',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'FHIR resource type',
            example: 'DocumentReference'
          },
          {
            name: 'resourceId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Resource ID'
          },
          {
            name: 'path',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'JSON path to the attachment within the resource',
            example: 'content[0].attachment'
          },
          {
            name: 'includeRawBase64',
            in: 'query',
            required: false,
            schema: { type: 'boolean', default: false },
            description: 'Include raw base64 content in response'
          }
        ],
        responses: {
          '200': {
            description: 'Attachment content in Markdown format',
            content: {
              'text/markdown': {
                schema: { type: 'string' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '404': {
            description: 'Attachment not found',
            content: {
              'text/markdown': {
                schema: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }
};
