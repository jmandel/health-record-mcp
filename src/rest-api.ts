// REST API server exposing EHR tools via OpenAPI endpoints
import { Database } from 'bun:sqlite';
import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import https from 'https';
import fs from 'fs/promises';
import { Command } from 'commander';

import { AppConfig, loadConfig } from './config.js';
import { addOauthRoutesAndProvider, MyOAuthServerProvider } from './oauth.js';
import { UserSession, createOrOpenDbForSession, activeSessions } from './sessionUtils.js';
import { 
    grepRecordLogic, 
    queryRecordLogic, 
    evalRecordLogic,
    readResourceLogic,
    readAttachmentLogic
} from './tools.js';
import { ClientFullEHR } from '../clientTypes.js';
import { openApiSpec } from './openapi-spec.js';

// Augment Express Request type
declare module "express-serve-static-core" {
    interface Request {
        auth?: { token: string };
    }
}

let config: AppConfig;
let oauthProvider: MyOAuthServerProvider;

async function main() {
    const program = new Command();
    program
        .name('smart-mcp-rest-api')
        .description('SMART on FHIR REST API Server with OpenAPI documentation')
        .version('1.0.0')
        .option('-c, --config <path>', 'Path to configuration file', './config.json')
        .parse(process.argv);

    const options = program.opts();
    const configPath = options.config || Bun.env.MCP_CONFIG_PATH || './config.json';

    console.log(`[CONFIG] Loading configuration from: ${configPath}`);
    config = await loadConfig(configPath);

    const app = express();
    app.use(cors());
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Logging middleware
    app.use((req, res, next) => {
        console.log(`[REST API] ${req.method} ${req.path}`);
        next();
    });
    
    // Serve static files
    app.use(express.static('static'));

    // Setup OAuth routes
    oauthProvider = addOauthRoutesAndProvider(app, config, activeSessions);
    console.log("[INIT] OAuth routes and provider initialized.");

    // Custom bearer auth middleware
    const customBearerAuthMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
            res.status(401).header('WWW-Authenticate', 'Bearer').json({ 
                error: 'unauthorized', 
                error_description: 'Missing bearer token.' 
            });
            return;
        }
        
        const token = authHeader.substring(7);
        try {
            const authInfo = await oauthProvider.verifyAccessToken(token);
            req.auth = { token };
            next();
        } catch (error: any) {
            res.status(401).header('WWW-Authenticate', 'Bearer error="invalid_token"').json({ 
                error: 'invalid_token', 
                error_description: 'The access token is invalid or has expired.' 
            });
            return;
        }
    };

    // Helper to get session context
    const getSessionContext = async (token: string): Promise<{ fullEhr: ClientFullEHR, db: Database }> => {
        const session = activeSessions.get(token);
        if (!session) {
            throw new Error('No active session found for this token.');
        }
        const db = await createOrOpenDbForSession(session, config);
        if (!session.fullEhr) {
            throw new Error('No EHR data available for this session.');
        }
        return { fullEhr: session.fullEhr, db };
    };

    // ==================== OpenAPI Documentation ====================
    
    // Serve OpenAPI spec as JSON
    app.get('/api/openapi.json', (_req, res) => {
        res.json(openApiSpec);
    });

    // Serve Swagger UI (if swagger-ui-express is installed)
    try {
        const swaggerUi = await import('swagger-ui-express');
        app.use('/api-docs', swaggerUi.default.serve, swaggerUi.default.setup(openApiSpec, {
            customSiteTitle: 'EHR Search API Documentation',
            customCss: '.swagger-ui .topbar { display: none }'
        }));
        console.log('[INIT] Swagger UI available at /api-docs');
    } catch (e) {
        console.warn('[INIT] swagger-ui-express not installed. API docs will be available at /api/openapi.json only.');
    }

    // ==================== REST API Endpoints ====================

    // POST /api/grep - Search with text/regex
    app.post('/api/grep', customBearerAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
        try {
            const { fullEhr } = await getSessionContext(req.auth!.token);
            const { query, resource_types, resource_format, page_size, page } = req.body;

            if (!query || typeof query !== 'string') {
                res.status(400).json({ error: 'bad_request', error_description: 'Missing or invalid "query" parameter.' });
                return;
            }

            console.log(`[/api/grep] Query: "${query}", Types: ${resource_types?.join(',') || 'All'}, Format: ${resource_format || 'plaintext'}`);
            
            const result = await grepRecordLogic(
                fullEhr,
                query,
                resource_types,
                resource_format || 'plaintext',
                page_size || 50,
                page || 1
            );

            res.setHeader('Content-Type', 'text/markdown');
            res.send(result);
        } catch (error: any) {
            console.error('[/api/grep] Error:', error);
            res.status(500).json({ error: 'internal_error', error_description: error.message });
        }
    });

    // POST /api/query - Execute SQL query
    app.post('/api/query', customBearerAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
        try {
            const { db } = await getSessionContext(req.auth!.token);
            const { sql } = req.body;

            if (!sql || typeof sql !== 'string') {
                res.status(400).json({ error: 'bad_request', error_description: 'Missing or invalid "sql" parameter.' });
                return;
            }

            console.log(`[/api/query] SQL: ${sql.substring(0, 100)}...`);
            
            const resultString = await queryRecordLogic(db, sql);
            const result = JSON.parse(resultString);

            res.json(result);
        } catch (error: any) {
            console.error('[/api/query] Error:', error);
            res.status(500).json({ error: 'internal_error', error_description: error.message });
        }
    });

    // POST /api/eval - Execute JavaScript code
    app.post('/api/eval', customBearerAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
        try {
            const { fullEhr } = await getSessionContext(req.auth!.token);
            const { code } = req.body;

            if (!code || typeof code !== 'string') {
                res.status(400).json({ error: 'bad_request', error_description: 'Missing or invalid "code" parameter.' });
                return;
            }

            console.log(`[/api/eval] Code length: ${code.length}`);
            
            const resultString = await evalRecordLogic(fullEhr, code);
            const result = JSON.parse(resultString);

            res.json(result);
        } catch (error: any) {
            console.error('[/api/eval] Error:', error);
            res.status(500).json({ error: 'internal_error', error_description: error.message });
        }
    });

    // GET /api/resource/:resourceType/:resourceId - Get specific resource
    app.get('/api/resource/:resourceType/:resourceId', customBearerAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
        try {
            const { fullEhr } = await getSessionContext(req.auth!.token);
            const { resourceType, resourceId } = req.params;

            console.log(`[/api/resource] Reading ${resourceType}/${resourceId}`);
            
            const resultString = await readResourceLogic(fullEhr, resourceType, resourceId);
            const result = JSON.parse(resultString);

            res.json(result);
        } catch (error: any) {
            console.error('[/api/resource] Error:', error);
            res.status(500).json({ error: 'internal_error', error_description: error.message });
        }
    });

    // GET /api/attachment/:resourceType/:resourceId - Get attachment content
    app.get('/api/attachment/:resourceType/:resourceId', customBearerAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
        try {
            const { fullEhr } = await getSessionContext(req.auth!.token);
            const { resourceType, resourceId } = req.params;
            const { path, includeRawBase64 } = req.query;

            if (!path || typeof path !== 'string') {
                res.status(400).json({ error: 'bad_request', error_description: 'Missing or invalid "path" query parameter.' });
                return;
            }

            console.log(`[/api/attachment] Reading ${resourceType}/${resourceId}#${path}`);
            
            const result = await readAttachmentLogic(
                fullEhr, 
                resourceType, 
                resourceId, 
                path,
                includeRawBase64 === 'true'
            );

            res.setHeader('Content-Type', 'text/markdown');
            res.send(result);
        } catch (error: any) {
            console.error('[/api/attachment] Error:', error);
            res.status(500).json({ error: 'internal_error', error_description: error.message });
        }
    });

    // Health check endpoint
    app.get('/api/health', (_req, res) => {
        res.json({ status: 'ok', service: 'EHR Search REST API' });
    });

    // ==================== Start Server ====================
    
    let server: http.Server | https.Server;
    if (config.server.https.enabled) {
        try {
            const cert = await fs.readFile(config.server.https.certPath!);
            const key = await fs.readFile(config.server.https.keyPath!);
            server = https.createServer({ key, cert }, app);
            console.log('[INIT] HTTPS enabled');
        } catch (error) {
            console.error('[INIT] Failed to load HTTPS certificates:', error);
            throw error;
        }
    } else {
        server = http.createServer(app);
        console.log('[INIT] Running in HTTP mode');
    }

    const port = config.server.port;
    server.listen(port, () => {
        console.log(`\n========================================`);
        console.log(`[REST API] Server listening on ${config.server.baseUrl}`);
        console.log(`[REST API] API Base: ${config.server.baseUrl}/api`);
        console.log(`[REST API] OpenAPI Spec: ${config.server.baseUrl}/api/openapi.json`);
        console.log(`[REST API] Swagger UI: ${config.server.baseUrl}/api-docs`);
        console.log(`[REST API] Health Check: ${config.server.baseUrl}/api/health`);
        console.log(`========================================\n`);
    });
}

main().catch(error => {
    console.error("[Startup] FATAL ERROR during application startup:", error);
    process.exit(1);
});
