import express, { Application, Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto'; // For PKCE verification
import pkceChallenge from 'pkce-challenge'; // Keep for potential future use if needed
import { v4 as uuidv4 } from 'uuid';
import cookie from 'cookie'; // For parsing cookies
import { Database } from 'bun:sqlite'; // Import Database type if needed here

// Adjust SDK imports - Assuming types might be directly under sdk or specific submodules
// If these are still wrong, we might need the exact SDK structure/version.
import {
    AuthInfo,
} from "@modelcontextprotocol/sdk/server/auth/types.js";

import {
    OAuthClientInformationFull,
    OAuthClientMetadata,
    OAuthTokenRevocationRequest,
    OAuthTokens
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

// --- Local Imports ---
import { AppConfig } from './config.js'; // Import AppConfig
import {
    UserSession,
    ActiveTransportEntry,
    createSessionFromEhrData, // Function to create/save session
    loadSessionFromDb,         // Function to load session
    getSqliteFilePath          // Function to get DB path
} from './sessionUtils.js';
import { ClientFullEHR } from '../clientTypes.js'; // Assuming clientTypes is in parent dir
import {
    OAuthServerProvider,
} from '@modelcontextprotocol/sdk/server/auth/provider.js';

// --- Constants ---
const AuthGrantType = { // Define if not imported
    AuthorizationCode: 'authorization_code',
    // Add other grant types if needed
};
const PKCE_METHOD_S256 = 'S256';

// --- Internal State Management ---

// Temporary store for MCP authorization requests before user picks DB/connects EHR
interface PickerSessionState {
    pickerSessionId: string; // Unique ID for this picker interaction
    mcpClientId: string;
    mcpRedirectUri: string;
    mcpCodeChallenge?: string;
    mcpCodeChallengeMethod?: string;
    mcpState?: string;
    mcpScope?: string; // Store requested scope
    createdAt: number;
}
const pickerSessions = new Map<string, PickerSessionState>(); // Keyed by pickerSessionId
const PICKER_SESSION_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// Temporary store for state between initiating new EHR flow and the callback
interface AuthFlowState {
    authFlowId: string; // Unique ID for this specific auth flow instance
    mcpClientId: string;
    mcpRedirectUri: string;
    mcpCodeChallenge?: string;
    mcpCodeChallengeMethod?: string;
    mcpState?: string;
    mcpScope?: string; // Store requested scope from original picker session
    createdAt: number;
}
const authFlowStates = new Map<string, AuthFlowState>(); // Keyed by authFlowId
const AUTH_FLOW_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes for EHR login/fetch
const AUTH_FLOW_COOKIE_NAME = 'smartmcp_auth_flow';

// Stores completed UserSessions ready for token exchange, keyed by MCP Authorization Code
const sessionsByMcpAuthCode = new Map<string, UserSession>();
const MCP_AUTH_CODE_EXPIRY_MS = 2 * 60 * 1000; // 2 minutes

// Store for registered MCP clients (replace with dynamic registration/DB lookup if needed)
const registeredMcpClients = new Map<string, OAuthClientInformationFull>();

// --- Helper: SDK Basic Auth Parsing ---
// Re-implement or adjust based on actual SDK export if `parseBasicAuthHeader` is unavailable
// Define the missing type
interface BasicAuthCredentials {
    clientId: string;
    clientSecret?: string; // Make secret optional if applicable, adjust as needed
}

function parseSdkBasicAuthHeader(header: string): BasicAuthCredentials {
    const base64Credentials = header.substring(6); // Remove "Basic "
    const decoded = Buffer.from(base64Credentials, 'base64').toString('utf8');
    const [clientId, clientSecret] = decoded.split(':', 2);
    if (!clientId) {
        throw new Error("Invalid Basic Auth header format");
    }
    return { clientId, clientSecret };
}

// --- Helper: OAuth Errors ---
// Define basic error classes if not available from SDK
class BaseOAuthError extends Error /* implements OAuthError */ { // Removed implements if OAuthError isn't found/correct
    statusCode: number;
    error: string;
    constructor(statusCode: number, error: string, message: string) {
        super(message);
        this.statusCode = statusCode;
        this.error = error;
        Object.setPrototypeOf(this, new.target.prototype); // Preserve prototype chain
    }
}
class InvalidRequestError extends BaseOAuthError { constructor(message: string) { super(400, 'invalid_request', message); } }
class InvalidClientError extends BaseOAuthError { constructor(message: string) { super(401, 'invalid_client', message); } }
class InvalidGrantError extends BaseOAuthError { constructor(message: string) { super(400, 'invalid_grant', message); } }
class UnsupportedGrantTypeError extends BaseOAuthError { constructor(message: string) { super(400, 'unsupported_grant_type', message); } }
class ServerError extends BaseOAuthError { constructor(message: string) { super(500, 'server_error', message); } }
class InvalidTokenError extends BaseOAuthError { constructor(message: string) { super(401, 'invalid_token', message); } } // Define InvalidTokenError

// --- OAuth Provider Implementation ---

// Remove explicit implementation, rely on structural typing via the getter
class MyOAuthClientStore /* implements OAuthClientStore */ {
    async getClient(clientId: string): Promise<OAuthClientInformationFull | undefined> {
        let client = registeredMcpClients.get(clientId);
        if (client) { console.log(`[AUTH Client Store] Found client: ${clientId}`); }
        else { console.warn(`[AUTH Client Store] Client not found: ${clientId}`); }
        return client;
    }

    async addClient(clientInfo: OAuthClientInformationFull): Promise<void> {
        if (!clientInfo.client_id || !clientInfo.client_name || !clientInfo.redirect_uris || clientInfo.redirect_uris.length === 0) {
            throw new InvalidRequestError("Client info missing required fields (client_id, client_name, redirect_uris)");
        }
        if (registeredMcpClients.has(clientInfo.client_id)) {
            console.warn(`[AUTH Client Store] Attempted to register duplicate client ID: ${clientInfo.client_id}`);
            throw new InvalidRequestError(`Client ID ${clientInfo.client_id} is already registered.`);
        }
        if (!clientInfo.grant_types || clientInfo.grant_types.length === 0) {
            clientInfo.grant_types = [AuthGrantType.AuthorizationCode];
        }
        console.log(`[AUTH Client Store] Registering client: ${clientInfo.client_id} (${clientInfo.client_name})`);
        registeredMcpClients.set(clientInfo.client_id, clientInfo);
    }

    async removeClient(clientId: string): Promise<void> {
        if (registeredMcpClients.has(clientId)) {
            console.log(`[AUTH Client Store] Removing client: ${clientId}`);
            registeredMcpClients.delete(clientId);
        } else {
             console.warn(`[AUTH Client Store] Attempted to remove non-existent client: ${clientId}`);
        }
    }
}

class MyOAuthServerProvider implements OAuthServerProvider {
    private clientStore = new MyOAuthClientStore();
    private activeSessions: Map<string, UserSession>;

    constructor(activeSessionsRef: Map<string, UserSession>) {
        this.activeSessions = activeSessionsRef;
         console.log("[AUTH Provider] Initialized MyOAuthServerProvider.");
    }

    // --- Implement OAuthClientStore methods (delegated) ---
    async getClient(clientId: string): Promise<OAuthClientInformationFull | undefined> { return this.clientStore.getClient(clientId); }
    async addClient(clientInfo: OAuthClientInformationFull): Promise<void> { return this.clientStore.addClient(clientInfo); }
    async removeClient(clientId: string): Promise<void> { return this.clientStore.removeClient(clientId); }

    // --- Public getter for clientsStore as required by interface ---
    public get clientsStore(): MyOAuthClientStore {
        return this.clientStore;
    }

    // --- Existing Custom Methods ---
    async createAuthCode(session: UserSession): Promise<string> {
        const code = uuidv4();
        console.log(`[AUTH Provider] Creating auth code for session ${session.sessionId.substring(0,8)}...`);
        sessionsByMcpAuthCode.set(code, session);
        setTimeout(() => {
            if (sessionsByMcpAuthCode.has(code)) {
                console.log(`[AUTH Provider] Expiring auth code ${code.substring(0,8)}...`);
                sessionsByMcpAuthCode.delete(code);
            }
        }, MCP_AUTH_CODE_EXPIRY_MS);
        return code;
    }

    async getSessionByAuthCode(code: string): Promise<UserSession | undefined> {
        console.log(`[AUTH Provider] Looking up session for auth code ${code.substring(0,8)}...`);
        const session = sessionsByMcpAuthCode.get(code);
        if (session) {
            console.log(`[AUTH Provider] Found and consuming session for auth code ${code.substring(0,8)}...`);
            sessionsByMcpAuthCode.delete(code);
            return session;
        } else {
             console.warn(`[AUTH Provider] Auth code ${code.substring(0,8)}... not found or expired.`);
            return undefined;
        }
    }

    async createToken(session: UserSession, clientId: string, scope?: string): Promise<AuthInfo> {
        const token = session.sessionId;
         console.log(`[AUTH Provider] Creating token for session ${session.sessionId.substring(0,8)}... (Client: ${clientId})`);

        if (!this.activeSessions.has(token)) {
             console.warn(`[AUTH Provider] Session ${token.substring(0,8)}... not found in central activeSessions map during token creation. Adding it.`);
             this.activeSessions.set(token, session);
        } else {
             const existingSession = this.activeSessions.get(token)!;
             existingSession.mcpClientInfo = session.mcpClientInfo;
        }

        // Use 'scopes' instead of 'scope'
        const authInfo: AuthInfo = {
            token: token,
            clientId: clientId,
            // Split the scope string into an array
            scopes: (scope || session.mcpClientInfo.scope || '').split(' ').filter(s => s), // Split and filter empty strings
        };

        console.log(`[AUTH Provider] Token created: ${token.substring(0,8)}... for client ${clientId}`);
        return authInfo;
    }

    async getTokenInfo(token: string): Promise<AuthInfo | undefined> {
        const session = this.activeSessions.get(token);
        if (!session) {
             console.warn(`[AUTH Provider] Token validation failed: Session not found for token ${token.substring(0,8)}...`);
            return undefined;
        }

        // Use 'scopes' instead of 'scope'
        const authInfo: AuthInfo = {
            token: token,
            clientId: session.mcpClientInfo.client_id,
            // Split the scope string into an array
            scopes: (session.mcpClientInfo.scope || '').split(' ').filter(s => s), // Split and filter empty strings
        };
        return authInfo;
    }

    async revokeToken(client: OAuthClientInformationFull, request: OAuthTokenRevocationRequest): Promise<void> {
        const token = request.token;
         console.log(`[AUTH Provider] Revoking token ${token.substring(0,8)}... (Client: ${client.client_id})`);
         // Optional: Add checks using client if needed (e.g., ensure client owns the token)
         const session = this.activeSessions.get(token);
         if (session) {
             if (session.db) {
                 try {
                     console.log(`[AUTH Provider] Closing DB for revoked session ${token.substring(0, 8)}...`);
                     session.db.close();
                 } catch (dbErr) {
                     console.error(`[AUTH Provider] Error closing DB for revoked session ${token.substring(0, 8)}...:`, dbErr);
                 }
             }
             this.activeSessions.delete(token);
             console.log(`[AUTH Provider] Session removed for revoked token ${token.substring(0, 8)}... Active sessions: ${this.activeSessions.size}`);
         } else {
             console.warn(`[AUTH Provider] Attempted to revoke token ${token.substring(0,8)}... but no active session found.`);
         }
    }

    async verifyAccessToken(mcpAccessToken: string): Promise<AuthInfo> {
        console.log(`[AUTH Provider] Verifying MCP token: ${mcpAccessToken.substring(0, 8)}...`);
        const session = this.activeSessions.get(mcpAccessToken);

        if (!session) {
            console.warn(`[AUTH Provider] MCP Token ${mcpAccessToken.substring(0,8)}... not found in active sessions.`);
            throw new InvalidTokenError("Invalid or expired access token");
        }

        console.log(`[AUTH Provider] MCP Token verified for client: ${session.mcpClientInfo.client_id}`);
        // Return AuthInfo based on the found session
        // Use session.mcpClientInfo.scopes consistently
        return {
            token: mcpAccessToken,
            clientId: session.mcpClientInfo.client_id,
            // Split the scope string into an array
            scopes: (session.mcpClientInfo.scope || '').split(' ').filter(s => s), // Split and filter empty strings
        };
    }

    // --- Implement Required OAuthServerProvider Methods (Stubs/Updated Signatures) ---

    async authorize(request: any): Promise<any> { // Replace 'any' with actual request/response types from SDK if known
        console.error("[AUTH Provider] authorize() called but not implemented. Logic is currently in /authorize route.");
        throw new ServerError("Authorization logic not implemented in provider.");
        // TODO: Refactor logic from GET /authorize route handler here
    }

    async challengeForAuthorizationCode(client: OAuthClientInformationFull, authorizationCode: string): Promise<string> {
        console.log(`[AUTH Provider] challengeForAuthorizationCode() called for client ${client.client_id}.`);
        // Use the passed authorizationCode
        const session = sessionsByMcpAuthCode.get(authorizationCode);
        if (session && session.mcpCodeChallenge) {
            // Ensure the code belongs to the correct client
            if (session.mcpClientInfo.client_id !== client.client_id) {
                console.warn(`[AUTH Provider] challengeForAuthorizationCode: Client mismatch. Expected ${session.mcpClientInfo.client_id}, got ${client.client_id}.`);
                 sessionsByMcpAuthCode.delete(authorizationCode); // Consume the code to prevent reuse
                throw new InvalidGrantError("Authorization code client mismatch.");
            }
            // Return only the challenge string
            return session.mcpCodeChallenge;
        }
        console.warn(`[AUTH Provider] challengeForAuthorizationCode: No session or challenge found for code ${authorizationCode.substring(0,8)}...`);
        // Throw error as the interface expects a string promise
        throw new InvalidGrantError("Invalid or expired authorization code.");
    }

    async exchangeAuthorizationCode(client: OAuthClientInformationFull, authorizationCode: string): Promise<OAuthTokens> {
        console.error("[AUTH Provider] exchangeAuthorizationCode() called but not implemented. Logic is currently in POST /token route.");
        // Params like redirect_uri, code_verifier would need to be accessed differently if this signature is correct
        // console.log("[AUTH Provider] exchangeAuthorizationCode params received:", params); 
        throw new ServerError("Authorization code exchange logic not implemented in provider.");
        // TODO: Refactor logic from POST /token route handler (for authorization_code grant) here
    }

    async exchangeRefreshToken(client: OAuthClientInformationFull, refreshToken: string, scopes?: string[]): Promise<OAuthTokens> {
        console.warn("[AUTH Provider] exchangeRefreshToken() called but refresh tokens are not supported.");
        throw new UnsupportedGrantTypeError("Refresh token grant type not supported.");
    }
}

// --- Route Setup Function ---

export function addOauthRoutesAndProvider(
    app: Application,
    config: AppConfig,
    activeSessions: Map<string, UserSession>,
    activeSseTransports: Map<string, ActiveTransportEntry>,
    loadSessionFromDb: (sessionId: string, mcpClientInfo: OAuthClientInformationFull, dbPath: string) => Promise<UserSession | null>,
): OAuthServerProvider {

    const oauthProvider = new MyOAuthServerProvider(activeSessions);

    function cleanupExpiredState() {
        const now = Date.now();
        pickerSessions.forEach((state, id) => { if (now > state.createdAt + PICKER_SESSION_EXPIRY_MS) { console.log(`[AUTH State Cleanup] Expiring picker session: ${id}`); pickerSessions.delete(id); } });
        authFlowStates.forEach((state, id) => { if (now > state.createdAt + AUTH_FLOW_EXPIRY_MS) { console.log(`[AUTH State Cleanup] Expiring auth flow state: ${id}`); authFlowStates.delete(id); } });
    }
    setInterval(cleanupExpiredState, 60 * 1000);

    app.get('/.well-known/oauth-authorization-server', (req, res) => {
        console.log("[.well-known] Request received.");
        res.json({
            issuer: config.server.baseUrl,
            registration_endpoint: `${config.server.baseUrl}/register`,
            authorization_endpoint: `${config.server.baseUrl}/authorize`,
            token_endpoint: `${config.server.baseUrl}/token`,
            revocation_endpoint: `${config.server.baseUrl}/revoke`,
            scopes_supported: ["openid", "fhirUser", "launch/patient", "patient/*.read", "offline_access"],
            response_types_supported: ["code"],
            grant_types_supported: [AuthGrantType.AuthorizationCode],
            token_endpoint_auth_methods_supported: ["none"],
            code_challenge_methods_supported: [PKCE_METHOD_S256]
        });
    });

    app.get('/authorize', async (req, res, next) => {
        console.log("[/authorize GET] Received authorization request query:", req.query);
        const { response_type, client_id, redirect_uri, code_challenge, code_challenge_method, state, scope } = req.query;

        if (response_type !== 'code') return next(new InvalidRequestError('Invalid response_type. Only "code" is supported.'));
        if (!client_id || typeof client_id !== 'string') return next(new InvalidRequestError('Missing or invalid client_id.'));
        if (!redirect_uri || typeof redirect_uri !== 'string') return next(new InvalidRequestError('Missing or invalid redirect_uri.'));
        if (!code_challenge || typeof code_challenge !== 'string') return next(new InvalidRequestError('Missing PKCE code_challenge.'));
        if (code_challenge_method && code_challenge_method !== PKCE_METHOD_S256) return next(new InvalidRequestError('Unsupported code_challenge_method. Only S256 is supported.'));

        try {
            const client = await oauthProvider.getClient(client_id);
            if (!client) return next(new InvalidClientError(`Client not registered: ${client_id}`));
            if (!client.redirect_uris.includes(redirect_uri)) {
                console.error(`[/authorize GET] Redirect URI mismatch for client ${client_id}. Provided: ${redirect_uri}, Allowed: ${client.redirect_uris}`);
                return next(new InvalidRequestError('Invalid redirect_uri.'));
            }

            cleanupExpiredState();
            const pickerSessionId = uuidv4();
            const pickerState: PickerSessionState = {
                pickerSessionId: pickerSessionId,
                mcpClientId: client_id,
                mcpRedirectUri: redirect_uri,
                mcpCodeChallenge: code_challenge,
                mcpCodeChallengeMethod: code_challenge_method || PKCE_METHOD_S256,
                mcpState: typeof state === 'string' ? state : undefined,
                mcpScope: typeof scope === 'string' ? scope : undefined,
                createdAt: Date.now(),
            };
            pickerSessions.set(pickerSessionId, pickerState);

            console.log(`[/authorize GET] Stored picker session ${pickerSessionId} for client ${client_id}. Redirecting to picker UI.`);
            const pickerUrl = `/static/db-picker.html?pickerSessionId=${pickerSessionId}`;
            res.redirect(pickerUrl);

        } catch (error) {
            console.error("[/authorize GET] Error during authorization:", error);
            next(error instanceof BaseOAuthError ? error : new ServerError('An unexpected error occurred during authorization.'));
        }
    });

    app.get('/initiate-session-from-db', async (req, res, next): Promise<void> => {
        console.log("[/initiate-session-from-db GET] Received request query:", req.query);
        const databaseId = req.query.databaseId as string | undefined;
        const pickerSessionId = req.query.pickerSessionId as string | undefined;

        let pickerState: PickerSessionState | undefined = undefined;
        let loadedSession: UserSession | null = null; // Keep track of loaded session for cleanup

        try {
            // --- Parameter Validation (Query Params) ---
            if (!databaseId) throw new InvalidRequestError("Missing required query parameter: databaseId");
            if (!pickerSessionId) throw new InvalidRequestError("Missing required query parameter: pickerSessionId");
            console.log(`[/initiate-session-from-db GET] Params: dbId=${databaseId}, pickerId=${pickerSessionId}`);

            // --- Retrieve and Validate Picker Session State ---
            pickerState = pickerSessions.get(pickerSessionId);
            if (!pickerState) {
                console.warn(`[/initiate-session-from-db GET] Picker session not found or expired: ${pickerSessionId}`);
                // Don't throw immediately, try to redirect with error if possible later
            } else {
                 pickerSessions.delete(pickerSessionId); // Consume the state only if found
                 console.log(`[/initiate-session-from-db GET] Retrieved picker state for client ${pickerState.mcpClientId}`);
                 // Optional: Add expiry check if PickerSessionState has expiry property
                 // if (pickerState.expiresAt < Date.now()) throw new InvalidRequestError("Picker session expired.");
            }
             // Ensure pickerState exists before proceeding
             if (!pickerState) throw new InvalidRequestError("Invalid or expired picker session ID.");


             // --- Get/Validate MCP Client Info (using pickerState) ---
             // Need client info *before* calling loadSessionFromDb
             const client = await oauthProvider.getClient(pickerState.mcpClientId);
             if (!client) {
                 console.error(`[/initiate-session-from-db GET] Client ${pickerState.mcpClientId} not found after retrieving picker state.`);
                 throw new InvalidClientError(`MCP Client not found: ${pickerState.mcpClientId}`);
             }
             if (!client.redirect_uris.includes(pickerState.mcpRedirectUri)) {
                  console.error(`[/initiate-session-from-db GET] Redirect URI mismatch. Client: ${client.redirect_uris}, Picker: ${pickerState.mcpRedirectUri}`);
                 throw new InvalidRequestError("Redirect URI from picker session does not match client registration.");
             }
             // Assign scope from picker state to the client info we'll use
             client.scope = pickerState.mcpScope;

            // --- Load Session Data --- Requires client info and dbPath
            if (!config.persistence?.directory) {
                 console.error("[/initiate-session-from-db GET] Persistence is not enabled or configured.");
                 throw new ServerError("Persistence not configured on server.");
            }
            const dbPath = getSqliteFilePath(config.persistence.directory, databaseId);
            loadedSession = await loadSessionFromDb(databaseId, client, dbPath);

            if (!loadedSession) {
                console.error(`[/initiate-session-from-db GET] Failed to load session from DB: ${dbPath}`);
                // Use a specific error or map to OAuth error
                throw new ServerError("Failed to load specified record."); // Or InvalidRequestError?
            }

            // --- Update UserSession Object --- PKCE details etc.
            loadedSession.mcpCodeChallenge = pickerState.mcpCodeChallenge;
            loadedSession.mcpCodeChallengeMethod = pickerState.mcpCodeChallengeMethod;
            // Ensure client info potentially updated with scope is on the session
            loadedSession.mcpClientInfo = client;

            // --- Generate MCP Auth Code & Store Session --- 
            const mcpAuthCode = await oauthProvider.createAuthCode(loadedSession);

            console.log(`[/initiate-session-from-db GET] Session loaded from DB ${databaseId}. Adding to sessionsByMcpAuthCode with code ${mcpAuthCode.substring(0,8)}...`);
            // The createAuthCode function already stored it in sessionsByMcpAuthCode
            // sessionsByMcpAuthCode.set(mcpAuthCode, loadedSession);

            // --- Redirect back to MCP Client --- 
            const redirectUrl = new URL(pickerState.mcpRedirectUri);
            redirectUrl.searchParams.set('code', mcpAuthCode);
            if (pickerState.mcpState) redirectUrl.searchParams.set('state', pickerState.mcpState);

            console.log(`[/initiate-session-from-db GET] Success. Redirecting client ${pickerState.mcpClientId} to ${redirectUrl.toString()}`);
            res.redirect(302, redirectUrl.toString());

        } catch (error: any) {
            console.error(`[/initiate-session-from-db GET] Error initiating session:`, error);
            
            // Try closing DB if it was opened during loadSessionFromDb before error
            if (loadedSession?.db && typeof loadedSession.db.close === 'function') { 
               try { 
                   console.log("[/initiate-session-from-db GET] Attempting to close DB after error...");
                   loadedSession.db.close(); 
                   console.log("[/initiate-session-from-db GET] Closed DB connection after error."); 
                } catch (dbCloseError) {
                     console.error("[/initiate-session-from-db GET] Error closing DB after primary error:", dbCloseError);
                 }
            }
            
            // Try to redirect back to the MCP client with an error
            const clientRedirectUriOnError = pickerState?.mcpRedirectUri; // Use optional chaining
            if (clientRedirectUriOnError && !res.headersSent) {
                try {
                    const redirectUrl = new URL(clientRedirectUriOnError);
                    if (error instanceof BaseOAuthError) {
                        redirectUrl.searchParams.set("error", error.error);
                        if (error.message) redirectUrl.searchParams.set("error_description", error.message);
                    } else {
                        redirectUrl.searchParams.set("error", "server_error");
                        redirectUrl.searchParams.set("error_description", "Failed to initialize session from stored record: " + (error?.message || 'Unknown error'));
                    }
                    if (pickerState?.mcpState) { // Use optional chaining
                        redirectUrl.searchParams.set("state", pickerState.mcpState);
                    }
                    
                    console.log(`[/initiate-session-from-db GET] Redirecting to client with error: ${redirectUrl.toString()}`);
                    res.redirect(302, redirectUrl.toString());
                    return; // Explicit return after redirect
                    
                } catch (urlError) {
                    console.error(`[/initiate-session-from-db GET] Invalid redirect URI for error reporting: ${clientRedirectUriOnError}`, urlError);
                    // Fall through to generic error handler / next()
                }
            }
            
            // Fallback: Pass error to central OAuth error handler or generic Express handler
             if (!res.headersSent) {
                 // If it's an OAuth error, let the dedicated middleware handle it
                 if (error instanceof BaseOAuthError) {
                      next(error);
                 } else {
                     // Otherwise, send a generic 500 or call next() with a generic error
                      console.error("[/initiate-session-from-db GET] Could not redirect error to client. Sending 500.");
                      res.status(500).send("Internal server error initiating session from stored record.");
                 }
            }
        }
    });

    // Restore GET method, query params, and redirect logic
    app.get('/initiate-new-ehr-flow', async (req, res) => {
         console.log("[/initiate-new-ehr-flow GET] Received request query:", req.query);
         const pickerSessionId = req.query.pickerSessionId as string | undefined;

         if (!pickerSessionId || typeof pickerSessionId !== 'string') {
            console.error("[/initiate-new-ehr-flow GET] Missing or invalid pickerSessionId query parameter.");
            res.status(400).send("Missing or invalid pickerSessionId parameter.");
            return;
         }

         const pickerState = pickerSessions.get(pickerSessionId);
         if (!pickerState) {
              console.warn(`[/initiate-new-ehr-flow GET] Picker session not found or expired: ${pickerSessionId}`);
             res.status(400).send("Invalid or expired picker session.");
             return;
         }
         // Consume the state *after* validation
         pickerSessions.delete(pickerSessionId);
         console.log(`[/initiate-new-ehr-flow GET] Starting flow for picker session ${pickerSessionId}, client ${pickerState.mcpClientId}`);
         // Optional: Add expiry check if PickerSessionState has expiry
         // if (pickerState.expiresAt < Date.now()) { ... }

         try {
             cleanupExpiredState(); // Clean up any other expired states first
             const authFlowId = uuidv4();
             const flowState: AuthFlowState = {
                 authFlowId: authFlowId,
                 mcpClientId: pickerState.mcpClientId,
                 mcpRedirectUri: pickerState.mcpRedirectUri,
                 mcpCodeChallenge: pickerState.mcpCodeChallenge,
                 mcpCodeChallengeMethod: pickerState.mcpCodeChallengeMethod,
                 mcpState: pickerState.mcpState,
                 mcpScope: pickerState.mcpScope,
                 createdAt: Date.now(),
             };
             authFlowStates.set(authFlowId, flowState);
             console.log(`[/initiate-new-ehr-flow GET] Created auth flow state ${authFlowId} for client ${pickerState.mcpClientId}.`);

             res.setHeader('Set-Cookie', cookie.serialize(AUTH_FLOW_COOKIE_NAME, authFlowId, {
                 httpOnly: true,
                 secure: config.server.https?.enabled ?? false,
                 path: '/',
                 maxAge: AUTH_FLOW_EXPIRY_MS / 1000,
                 sameSite: 'lax'
             }));

             const retrieverUrl = '/static/ehretriever.html#deliver-to:mcp-callback'; 
             console.log(`[/initiate-new-ehr-flow GET] Redirecting user agent to EHR retriever: ${retrieverUrl}`);
             res.redirect(302, retrieverUrl); // Use 302 for redirect

         } catch (error: any) {
            console.error(`[/initiate-new-ehr-flow GET] Error initiating new EHR flow for picker session ${pickerSessionId}:`, error);
            // Generic error back to browser if something unexpected happens
             if (!res.headersSent) {
                 res.status(500).send("Internal server error initiating EHR flow.");
             }
         }
    });

    app.get(config.server.ehrCallbackPath || '/ehr-callback', (req, res) => {
         console.log(`[${config.server.ehrCallbackPath || '/ehr-callback'} GET] Received SMART callback. Query:`, req.query);
         res.sendFile(path.resolve(process.cwd(), 'static', 'ehretriever.html'));
    });

    app.post('/ehr-retriever-callback', express.json({ limit: '50mb' }), async (req, res, next) => {
         console.log("[/ehr-retriever-callback POST] Received data from EHR retriever.");
         const ehrData: ClientFullEHR = req.body;

         const cookies = cookie.parse(req.headers.cookie || '');
         const authFlowId = cookies[AUTH_FLOW_COOKIE_NAME];

         if (!authFlowId) {
             console.error("[/ehr-retriever-callback POST] Missing auth flow cookie.");
             res.status(400).json({ success: false, error: "Authorization session expired or invalid." });
             return;
         }

         const flowState = authFlowStates.get(authFlowId);
         if (!flowState) {
             console.error(`[/ehr-retriever-callback POST] Auth flow state not found or expired for ID: ${authFlowId}`);
             res.setHeader('Set-Cookie', cookie.serialize(AUTH_FLOW_COOKIE_NAME, '', { maxAge: -1, path: '/' }));
             res.status(400).json({ success: false, error: "Authorization session expired or invalid." });
             return;
         }
         authFlowStates.delete(authFlowId);
         res.setHeader('Set-Cookie', cookie.serialize(AUTH_FLOW_COOKIE_NAME, '', { maxAge: -1, path: '/' }));

         if (!ehrData) {
             console.error(`[/ehr-retriever-callback POST] Error reported by EHR retriever: ${ 'Missing EHR data'}`);
             const redirectUrl = new URL(flowState.mcpRedirectUri);
             redirectUrl.searchParams.set('error', 'access_denied');
             redirectUrl.searchParams.set('error_description', `Failed to retrieve EHR data: ${ 'Unknown error'}`);
             if (flowState.mcpState) redirectUrl.searchParams.set('state', flowState.mcpState);
             console.log(`[/ehr-retriever-callback POST] Redirecting client ${flowState.mcpClientId} to error URL: ${redirectUrl.toString()}`);
             res.json({ success: false, error: 'Missing EHR data', redirectUrl: redirectUrl.toString() });
             return;
         }

         try {
             console.log(`[/ehr-retriever-callback POST] Successfully received EHR data for flow ${authFlowId}. Processing...`);
             console.log(`[/ehr-retriever-callback POST] FHIR Resource Types: ${Object.keys(ehrData.fhir || {}).length}, Attachments: ${ehrData.attachments?.length ?? 0}`);

             const client = await oauthProvider.getClient(flowState.mcpClientId);
             if (!client) {
                 console.error(`[/ehr-retriever-callback POST] Client ${flowState.mcpClientId} not found after retrieving flow state.`);
                 throw new Error("Internal server error: Client not found.");
             }
             client.scope = flowState.mcpScope; // Assign scope(s)

             const newSessionId = uuidv4();

             // Handle potentially undefined config properties
             const persistenceEnabled = config.persistence?.enabled ?? false;
             const persistenceDir = config.persistence?.directory;

             const newSession = await createSessionFromEhrData(
                 newSessionId,
                 client,
                 ehrData,
                 persistenceEnabled, // Pass boolean
                 persistenceDir // Pass potentially undefined string
             );

             // Store PKCE challenge details directly on the session object
             newSession.mcpCodeChallenge = flowState.mcpCodeChallenge;
             newSession.mcpCodeChallengeMethod = flowState.mcpCodeChallengeMethod;

             const mcpAuthCode = await oauthProvider.createAuthCode(newSession);

             const redirectUrl = new URL(flowState.mcpRedirectUri);
             redirectUrl.searchParams.set('code', mcpAuthCode);
             if (flowState.mcpState) redirectUrl.searchParams.set('state', flowState.mcpState);

             console.log(`[/ehr-retriever-callback POST] New session ${newSessionId.substring(0,8)} created. Redirecting client ${flowState.mcpClientId} to ${redirectUrl.toString()}`);
             res.json({ success: true, redirectTo: redirectUrl.toString() });

         } catch (error) {
             console.error("[/ehr-retriever-callback POST] Error processing EHR data:", error);
             const redirectUrl = new URL(flowState.mcpRedirectUri);
             redirectUrl.searchParams.set('error', 'server_error');
             redirectUrl.searchParams.set('error_description', `Internal server error processing EHR data.`);
             if (flowState.mcpState) redirectUrl.searchParams.set('state', flowState.mcpState);
             res.status(500).json({ success: false, error: "Internal server error processing data.", redirectUrl: redirectUrl.toString() });
         }
    });

    app.post('/token', express.urlencoded({ extended: true }), async (req, res, next) => {
         console.log("[/token POST] Received token request body:", req.body);
        const { grant_type, code, redirect_uri, client_id, code_verifier } = req.body;

        let providedClientId = client_id;
        let clientSecret: string | undefined = undefined;

        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.toLowerCase().startsWith('basic ')) {
            try {
                const creds = parseSdkBasicAuthHeader(authHeader);
                providedClientId = creds.clientId;
                clientSecret = creds.clientSecret;
                 console.log(`[/token POST] Basic Auth detected for client: ${providedClientId}`);
            } catch (e: any) {
                 return next(new InvalidRequestError(`Invalid Basic Authorization header: ${e.message}`));
            }
        }

        if (!providedClientId || typeof providedClientId !== 'string') {
            return next(new InvalidRequestError('Missing client_id (required in body or Basic Auth).'));
        }

        try {
            const client = await oauthProvider.getClient(providedClientId);
            if (!client) {
                 console.error(`[/token POST] Client not registered: ${providedClientId}`);
                return next(new InvalidClientError(`Client not registered: ${providedClientId}`));
            }

            if (grant_type === AuthGrantType.AuthorizationCode) {
                if (!code || typeof code !== 'string') return next(new InvalidRequestError('Missing authorization code.'));
                // if (!redirect_uri || typeof redirect_uri !== 'string') return next(new InvalidRequestError('Missing redirect_uri.'));
                // if (!client.redirect_uris.includes(redirect_uri)) {
                //      console.error(`[/token POST] Redirect URI mismatch for client ${client.client_id}. Provided: ${redirect_uri}, Allowed: ${client.redirect_uris}`);
                //     return next(new InvalidRequestError('Invalid redirect_uri.'));
                // }


                if (!code_verifier || typeof code_verifier !== 'string') return next(new InvalidRequestError('Missing PKCE code_verifier.'));
                const session = await oauthProvider.getSessionByAuthCode(code);
                if (!session) {
                    console.warn(`[/token POST] Invalid or expired authorization code: ${code.substring(0,8)}...`);
                    return next(new InvalidGrantError('Invalid or expired authorization code.'));
                }
                if (session.mcpClientInfo.client_id !== client.client_id) {
                      console.error(`[/token POST] Client ID mismatch! Token requested by ${client.client_id}, but code belongs to ${session.mcpClientInfo.client_id}.`);
                     await oauthProvider.revokeToken(client, { token: session.sessionId });
                     return next(new InvalidGrantError('Client ID does not match the authorization code grant.'));
                 }

                 // --- PKCE Verification using crypto ---
                 const challenge = session.mcpCodeChallenge;
                 const method = session.mcpCodeChallengeMethod || PKCE_METHOD_S256;

                 if (!challenge) {
                     console.error(`[/token POST] Missing code_challenge in session for client ${client.client_id}. PKCE was required.`);
                      await oauthProvider.revokeToken(client, { token: session.sessionId });
                     return next(new InvalidGrantError('PKCE challenge failed: Challenge missing from authorization request.'));
                 }

                 let calculatedChallenge: string;
                 if (method === PKCE_METHOD_S256) {
                    try {
                        calculatedChallenge = crypto.createHash('sha256')
                                                   .update(code_verifier) // Hash the verifier
                                                   .digest('base64') // Get base64 digest
                                                   .replace(/\+/g, '-') // Replace + with -
                                                   .replace(/\//g, '_') // Replace / with _
                                                   .replace(/=+$/, ''); // Remove trailing =
                    } catch (pkceError) {
                        console.error(`[/token POST] Error generating PKCE challenge from verifier:`, pkceError);
                         await oauthProvider.revokeToken(client, { token: session.sessionId });
                        return next(new InvalidGrantError('PKCE challenge failed: Error during verification.'));
                    }
                 } else {
                     console.error(`[/token POST] Unsupported PKCE method found in session: ${method}`);
                     await oauthProvider.revokeToken(client, { token: session.sessionId });
                     return next(new InvalidGrantError('PKCE challenge failed: Unsupported method.'));
                 }

                 console.log(`[/token POST] PKCE Check. Stored: ${challenge}, Derived: ${calculatedChallenge}`);
                 if (challenge !== calculatedChallenge) {
                      console.error(`[/token POST] PKCE challenge mismatch for client ${client.client_id}.`);
                      await oauthProvider.revokeToken(client, { token: session.sessionId });
                     return next(new InvalidGrantError('PKCE challenge failed: Verifier does not match challenge.'));
                 }
                 console.log(`[/token POST] PKCE verification successful for client ${client.client_id}.`);

                // Use 'scopes'
                const tokenInfo = await oauthProvider.createToken(session, client.client_id, session.mcpClientInfo.scope);

                // Remove expires_in from response
                res.json({
                    access_token: tokenInfo.token,
                    token_type: "Bearer",
                    scopes: tokenInfo.scopes, // Use 'scopes'
                });
                 console.log(`[/token POST] Issued token ${tokenInfo.token.substring(0,8)}... to client ${client.client_id}`);

            } else {
                 console.warn(`[/token POST] Unsupported grant_type requested: ${grant_type}`);
                return next(new UnsupportedGrantTypeError(`Unsupported grant_type: ${grant_type}`));
            }

        } catch (error) {
            console.error("[/token POST] Error during token exchange:", error);
             next(error instanceof BaseOAuthError ? error : new ServerError('An unexpected error occurred during token exchange.'));
        }
    });

    app.post('/register', express.json(), async (req, res, next) => {
        console.log("[/register POST] Received client registration request:", req.body);

        try {
            const clientInfo: OAuthClientInformationFull = {
                client_id: uuidv4(),
                client_name: req.body.client_name,
                redirect_uris: req.body.redirect_uris,
                grant_types: req.body.grant_types || [AuthGrantType.AuthorizationCode],
                 token_endpoint_auth_method: req.body.token_endpoint_auth_method || 'none',
                 // Assign scopes if provided
                 scope: req.body.scopes,
            };

            await oauthProvider.addClient(clientInfo);
            const responseClientInfo = { ...clientInfo };

            console.log(`[/register POST] Successfully registered client ${clientInfo.client_id} (${clientInfo.client_name})`);
            res.status(201).json(responseClientInfo);

        } catch (error) {
             console.error("[/register POST] Error during client registration:", error);
             if (error instanceof InvalidRequestError) {
                 res.status(400).json({ error: error.error, error_description: error.message });
             } else {
                 res.status(500).json({ error: "server_error", error_description: "Failed to register client." });
             }
        }
    });

    app.post('/revoke', express.urlencoded({ extended: true }), async (req, res, next) => {
         console.log("[/revoke POST] Received token revocation request:", req.body);
        const { token, token_type_hint } = req.body;

        let providedClientId: string | undefined = undefined;
        const authHeader = req.headers.authorization;
         if (authHeader && authHeader.toLowerCase().startsWith('basic ')) {
             try {
                 providedClientId = parseSdkBasicAuthHeader(authHeader).clientId;
                  console.log(`[/revoke POST] Basic Auth detected for client: ${providedClientId}`);
             } catch { /* ignore invalid header */ }
         }
          if (!providedClientId && req.body.client_id) {
              providedClientId = req.body.client_id;
               console.log(`[/revoke POST] Client ID found in body: ${providedClientId}`);
          }

        if (!token || typeof token !== 'string') return next(new InvalidRequestError('Missing token.'));
        if (token_type_hint && token_type_hint !== 'access_token') {
             console.log(`[/revoke POST] Ignoring revocation request for unsupported token type: ${token_type_hint}`);
             res.status(200).send();
             return;
        }

        try {
             if (providedClientId) {
                 const tokenInfo = await oauthProvider.getTokenInfo(token);
                 const client = await oauthProvider.getClient(providedClientId);
                 if (!client) {
                     // Client specified but not found - treat as invalid request?
                     // Or proceed with revocation anyway?
                     // Let's proceed but log a warning.
                      console.warn(`[/revoke POST] Client ${providedClientId} specified but not found.`);
                     // return next(new InvalidClientError(`Client not registered: ${providedClientId}`));
                 }
                 // Check if token belongs to the client requesting revocation
                 if (client && tokenInfo && tokenInfo.clientId !== client.client_id) {
                     console.warn(`[/revoke POST] Client ${client.client_id} attempted to revoke token belonging to client ${tokenInfo.clientId}. Revocation still proceeding.`);
                     // NOTE: Spec allows revoking tokens client doesn't own in some cases.
                     // If stricter check is needed, throw an error here.
                 }
                 // If client is required for revocation by the provider method:
                 if (client) {
                     await oauthProvider.revokeToken(client, { token });
                 } else {
                     // Handle case where client wasn't found but revocation might still be possible
                     // This depends on whether revokeToken *requires* the client object.
                     // Assuming it does based on the signature, this path shouldn't be hit
                     // unless we remove the client check above.
                     // For now, let's assume the method requires the client.
                      console.warn(`[/revoke POST] Client ${providedClientId} not found, cannot call revokeToken.`);
                     // Decide: error out or allow anonymous revocation?
                     // Let's error for now if client auth was provided but invalid.
                      return next(new InvalidClientError(`Client not registered: ${providedClientId}`));
                 }
             } else {
                 // No client authentication provided - this provider might not support anonymous revocation.
                 // However, the revokeToken method signature implies a client is needed.
                 // Let's assume anonymous revocation isn't intended here.
                  console.warn("[/revoke POST] Client authentication required for revocation.");
                 return next(new InvalidClientError("Client authentication required."));
             }

            console.log(`[/revoke POST] Revocation processed for token ${token.substring(0,8)}...`);
            res.status(200).send();

        } catch (error) {
            console.error("[/revoke POST] Error during token revocation:", error);
             next(error instanceof BaseOAuthError ? error : new ServerError('An unexpected error occurred during token revocation.'));
        }
    });

    // --- OAuth Error Handling Middleware ---
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
        if (err instanceof BaseOAuthError) {
            console.warn(`[AUTH Error] OAuth Error occurred: ${err.error} - ${err.message}`);
            res.status(err.statusCode).json({
                error: err.error,
                error_description: err.message
            });
        } else {
            next(err);
        }
    });

    return oauthProvider;
}
