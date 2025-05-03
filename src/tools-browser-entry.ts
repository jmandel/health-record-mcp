// src/tools-browser-entry.ts
// Entry point for building browser-compatible tool logic.

// Import only browser-safe dependencies and functions from the main tools file

import { z } from 'zod';

import { 
    GrepRecordInputSchema as GrepRecordZodSchema,
    ReadResourceInputSchema as ReadResourceZodSchema,
    ReadAttachmentInputSchema as ReadAttachmentZodSchema,
    registerEhrTools,
    // Note: QueryRecord and EvalRecord schemas are NOT included 
    // as their logic functions rely on Node/Bun specifics.
} from './tools';
console.log(GrepRecordZodSchema.shape);

// Logic Functions (Browser-Safe Only)
import {
    grepRecordLogic,
    readResourceLogic,
    readAttachmentLogic,
    // Note: queryRecordLogic and evalRecordLogic are NOT included.
} from './tools';

// Types (Assuming ClientFullEHR is a type definition)
import type { ClientFullEHR } from '../clientTypes';

// Dependencies (like Lodash if used by the included logic)
import _ from 'lodash';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { IntraBrowserServerTransport } from './IntraBrowserTransport';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// Re-export only the browser-compatible parts
export {
    McpServer,
    IntraBrowserServerTransport,
    // Export the generated JSON Schemas
    // Export Logic Functions
    registerEhrTools,
    grepRecordLogic,
    readResourceLogic,
    readAttachmentLogic,
    z

    // Types (exporting types might require specific tsconfig settings, 
    // but useful for consumers if bundling as a library)
    // ClientFullEHR, 

    // Dependencies (if needed directly by consumer)
    // _ 
};

// Type alias for convenience if needed by consumer
export type { ClientFullEHR }; 