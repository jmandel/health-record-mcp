/**
 * MCP Tool Server Client Library (for iframe using postMessage)
 * Simplifies implementing MCP server logic within an iframe.
 * Implements delayed handshake: Uses a Promise and signalReady() to coordinate.
 */

// Define a reasonable timeout for waiting for the client handshake
const HANDSHAKE_TIMEOUT_MS = 15000; // e.g., 15 seconds

export default class MCPToolServer {
    /**
     * Creates an MCPToolServer instance.
     * @param {object} [config] - Configuration options.
     * @param {object} [config.serverInfo] - Information about this server (e.g., { name: "my-tool", version: "1.0" }).
     * @param {string[] | string} [config.trustedClientOrigins] - An array of specific origins (e.g., ['https://client.com', 'http://localhost:3000'])
     *                                                          or a single origin string allowed to connect.
     *                                                          Use '*' ONLY for local development to allow any origin (INSECURE for production).
     *                                                          If omitted or invalid, an error is thrown unless '*' is used.
     * @param {boolean} [config.debug] - Enable verbose logging to the console. Defaults to false.
     */
    constructor(config = {}) {
        this.serverInfo = config.serverInfo || { name: "mcp-tool", version: "0.0.0" };
        this.trustedClientOrigins = new Set(
             Array.isArray(config.trustedClientOrigins)
                 ? config.trustedClientOrigins.filter(o => o && o !== '*')
                 : (config.trustedClientOrigins && config.trustedClientOrigins !== '*' ? [config.trustedClientOrigins] : [])
         );
        this.allowAnyOrigin = this.trustedClientOrigins.size === 0 && config.trustedClientOrigins === '*';

        this.tools = new Map();
        this.parentWindow = null;
        this.actualClientOrigin = null;
        this.sessionId = `server-pending-${self.crypto.randomUUID()}`;
        this.debug = config.debug || false;

        // --- State ---
        this.isConnected = false;
        this._appHasSignaledReady = false; // Track if signalReady was called
        this._pendingClientDetails = null;  // Store details upon handshake arrival
        this._handshakeTimeoutId = null;   // Timer for handshake timeout

        // --- Promise for Handshake Arrival ---
        this._resolveHandshake = null;
        this._rejectHandshake = null;
        this._handshakePromise = new Promise((resolve, reject) => {
            this._resolveHandshake = resolve;
            this._rejectHandshake = reject;
        });

        // Start timeout for handshake
        this._handshakeTimeoutId = setTimeout(() => {
            if (!this._pendingClientDetails) { // Only reject if handshake hasn't arrived yet
                this._log(`Timeout (${HANDSHAKE_TIMEOUT_MS}ms) waiting for client handshake.`);
                this._rejectHandshake?.(new Error("Timeout waiting for client handshake."));
            }
        }, HANDSHAKE_TIMEOUT_MS);

        if (this.allowAnyOrigin) {
             console.warn("MCPToolServer initialized with wildcard origin '*'. Insecure for production.");
         } else if (this.trustedClientOrigins.size === 0) {
              throw new Error("MCPToolServer: No specific trustedClientOrigins provided and wildcard '*' not allowed.");
         } else {
             this._log("Initializing MCPToolServer - Trusted Origins:", Array.from(this.trustedClientOrigins));
         }

        this._attachListener();
    }

    _log(message, ...args) {
        // Use pending or actual session ID for logging
        const id = this.isConnected ? this.sessionId : (this._pendingClientDetails?.sessionId || this.sessionId);
        if (this.debug) {
            console.log(`[MCPToolServer ${id}] ${message}`, ...args);
        }
    }

    _attachListener() {
        window.removeEventListener('message', this._handleMessage);
        window.addEventListener('message', this._handleMessage.bind(this));
        this._log("Attached message listener. Ready to receive handshake from trusted origins.");
    }

    _handleMessage(event) {
        // --- Security Checks: Source and Origin ---
        if (!event.source || event.source !== window.parent) {
            return; // Must be parent
        }

        let originToCheck = event.origin;
        let isHandshake = false;
        let messageData = event.data;

        // --- Handshake Detection ---
        if (typeof messageData === 'object' && messageData !== null && messageData.type === 'MCP_HANDSHAKE_CLIENT') {
            isHandshake = true;
            // *** Origin Check: Against configured trusted list or wildcard ***
            const isTrusted = this.allowAnyOrigin || this.trustedClientOrigins.has(originToCheck);
            if (!isTrusted) {
                this._log(`Ignoring handshake: Origin ${originToCheck} is not in the trusted list. Allowed: ${this.allowAnyOrigin ? '*' : Array.from(this.trustedClientOrigins)}`);
                return; // Exit if origin is not trusted
            }
            // *** Origin check passed ***

            const clientHandshake = messageData;
            this._log(`Received MCP_HANDSHAKE_CLIENT from TRUSTED origin ${originToCheck}:`, clientHandshake);

            if (!clientHandshake.sessionId) {
                 this._log("Handshake ignored: Missing sessionId.");
                 return;
            }

            // Decide how to handle this valid handshake message...
            if (this.isConnected && this.actualClientOrigin === originToCheck) {
                // Re-handshake from same client (e.g., client reload)
                this._log(`Duplicate handshake from connected origin ${originToCheck}. Session ID: ${clientHandshake.sessionId}. Responding again.`);
                this.sessionId = clientHandshake.sessionId; // Re-adopt ID
                 // Respond immediately since app is already ready
                this._sendHandshakeResponse(clientHandshake.sessionId, event.source, originToCheck);
            } else if (this.isConnected) {
                 // Handshake from a different origin while already connected
                 this._log(`Ignoring handshake from ${originToCheck}, already connected to ${this.actualClientOrigin}.`);
            } else if (this._pendingClientDetails) {
                // Already received a handshake, maybe updating details if session ID changed
                this._log(`Received another handshake while waiting for signalReady. Updating pending details.`);
                this._pendingClientDetails = {
                    clientOrigin: originToCheck,
                    sessionId: clientHandshake.sessionId,
                    sourceWindow: event.source
                };
                // No need to resolve the promise again
            } else {
                // First valid handshake received
                this._log(`Handshake details stored. Resolving handshake promise.`);
                 this._pendingClientDetails = {
                     clientOrigin: originToCheck,
                     sessionId: clientHandshake.sessionId,
                     sourceWindow: event.source
                 };
                 // Resolve the promise to signal arrival
                 this._resolveHandshake?.();
                 // Clear the timeout as we received the handshake
                 if (this._handshakeTimeoutId) {
                     clearTimeout(this._handshakeTimeoutId);
                     this._handshakeTimeoutId = null;
                 }
                 // NOTE: We do NOT complete the connection here yet. signalReady() must still be called.
            }
            return; // Handshake handled (or stored)
        }
        // ... [rest of message handling for connected state] ...
         else if (this.isConnected) {
            // --- Standard MCP Message Handling (Only if connected) ---
            if (originToCheck !== this.actualClientOrigin) { // Check against the specific connected origin
                this._log(`Ignoring message: Origin ${originToCheck} does not match established client origin ${this.actualClientOrigin}.`);
                return;
            }
            // Assume event.data is the object directly
            messageData = event.data;
        } else {
            // Not a handshake and not connected
            this._log("Ignoring message received before connection established (signalReady not called or handshake incomplete):", messageData);
            return;
        }


        // --- Process Valid, Connected MCP Message ---
        try {
            const isValidRequest = typeof messageData === 'object' && messageData !== null &&
                                   messageData.jsonrpc === "2.0" &&
                                   typeof messageData.method === 'string' &&
                                   messageData.id !== undefined && messageData.id !== null;

            const isNotification = typeof messageData === 'object' && messageData !== null &&
                                   messageData.jsonrpc === "2.0" &&
                                   typeof messageData.method === 'string' &&
                                   messageData.id === undefined;

            if (!isValidRequest && !isNotification) {
                this._log("Ignoring invalid/unrecognized JSON-RPC message structure:", messageData);
                return;
            }

            if(isNotification) {
                 this._log(`Received notification ${messageData.method}, ignoring.`);
                 return;
            }

            // It's a valid request
            const request = messageData;
            this._routeRequest(request);

        } catch (err) {
             const messageId = (typeof messageData === 'object' && messageData !== null) ? messageData.id : undefined;
             this._log(`Internal error processing request ID ${messageId}:`, err);
             this._sendError(messageId, -32603, "Internal server error processing request.", { details: err.message });
        }
    }

     _routeRequest(request) {
        // Ensure connection is established before routing
        if (!this.isConnected) {
             this._log(`Request ${request.method} received but connection not established. Ignoring.`);
             // Maybe send error? Need request ID.
             return;
        }
        switch (request.method) {
            case "initialize": this._handleInitialize(request); break;
            case "tools/list": this._handleToolsList(request); break;
            case "tools/call":
                Promise.resolve(this._handleToolsCall(request))
                    .catch(err => {
                        this._log(`Internal error during tools/call handling for ID ${request.id}:`, err);
                        this._sendError(request.id, -32603, "Internal server error processing tool call.", { details: err.message });
                    });
                break;
            case "ping": this._handlePing(request); break;
            default:
                this._log(`Unknown method: ${request.method}`);
                this._sendError(request.id, -32601, `Method not found: ${request.method}`);
                break;
         }
     }

    /**
     * Registers a tool and its handler function.
     * Should ideally be called BEFORE signalReady().
     * @param {object} toolDefinition - Tool definition (name, description, inputSchema, etc.)
     * @param {Function} handlerFn - Async function(args): Promise<{content: ToolResultContent[], isError: boolean}>
     */
    registerTool(toolDefinition, handlerFn) {
         if (this.isConnected || this._appHasSignaledReady) {
             console.warn(`MCPToolServer: registerTool called after signalReady. Tool '${toolDefinition?.name}' might not be listed correctly.`);
         }
        if (!toolDefinition || typeof toolDefinition.name !== 'string') {
            console.error("MCPToolServer: Invalid tool definition provided to registerTool.", toolDefinition);
            return;
        }
        if (typeof handlerFn !== 'function') {
             console.error(`MCPToolServer: Invalid handler function provided for tool '${toolDefinition.name}'.`);
             return;
        }
        this._log(`Registering tool: ${toolDefinition.name}`);
        this.tools.set(toolDefinition.name, { definition: toolDefinition, handlerFn });
    }

    /**
     * Signals that the application has finished setup (e.g., registering tools)
     * and is ready to complete the handshake and handle requests.
     * This function is now async and will wait for the client handshake if needed.
     * @returns {Promise<void>} Resolves when the connection is established, rejects on timeout or error.
     */
    async signalReady() {
        this._log("signalReady() called by application.");
        if (this.isConnected) {
            this._log("signalReady() called, but already connected. Ignoring.");
            return;
        }
        if (this._appHasSignaledReady) {
            this._log("signalReady() called multiple times. Returning existing promise/state.");
            // Optionally return the handshake promise again or just return void
             await this._handshakePromise; // Ensure we still wait if called rapidly twice
            return;
        }

        this._appHasSignaledReady = true; // Mark application as ready

        try {
            this._log("Waiting for client handshake promise to resolve...");
            // Wait for the handshake details promise to resolve (or reject on timeout)
            await this._handshakePromise;
            this._log("Client handshake promise resolved.");

            // Now that we have the handshake details (_pendingClientDetails is populated), complete the connection.
             if (this.isConnected) {
                 this._log("Connection was already completed concurrently. Exiting signalReady.");
                 return;
             }
            this._completeHandshake();

        } catch (error) {
            this._log("Error during signalReady (likely handshake timeout):", error);
            // Ensure state reflects failure
            this.isConnected = false;
             this.parentWindow = null;
             this.actualClientOrigin = null;
             // Re-throw or handle as appropriate for the application
            throw error;
        }
    }

    // --- Helper to complete the handshake ---
    _completeHandshake() {
        if (!this._pendingClientDetails) {
            this._log("Error: _completeHandshake called without pending details (should not happen after await).");
            // This case should be impossible if signalReady awaits correctly
            return;
        }
         if (this.isConnected) {
             this._log("Warning: _completeHandshake called when already connected.");
             return; // Avoid completing twice
         }

        const { clientOrigin, sessionId, sourceWindow } = this._pendingClientDetails;
        this.actualClientOrigin = clientOrigin;
        this.parentWindow = sourceWindow;
        this.sessionId = sessionId;

        this._log(`Completing handshake. Client: ${this.actualClientOrigin}, Session: ${this.sessionId}`);
        this._sendHandshakeResponse(this.sessionId, this.parentWindow, this.actualClientOrigin);

        if (this.parentWindow) {
            this.isConnected = true;
            // No need for _handshakePending flag anymore
            // _pendingClientDetails = null; // Keep details for reference? Or clear? Let's clear.
            this._pendingClientDetails = null;
            this._log("Connection established and ready for requests.");
        } else {
             this._log("Handshake completion failed (likely could not send response). State reset.");
             this.isConnected = false;
             // _pendingClientDetails = null; // Already cleared by error handling in sendHandshakeResponse
        }
    }

    /**
     * Sends a JSON-RPC notification to the parent.
     * Requires connection to be established (signalReady called and handshake completed).
     * @param {string} method - The notification method name (e.g., 'tool_status')
     * @param {object} [params] - Optional parameters for the notification.
     */
    sendNotification(method, params) {
        if (!this.isConnected) {
             this._log("Cannot send notification: Connection not established.");
             return;
        }
        if (!method) return;
        const notification = {
            jsonrpc: "2.0",
            method: method,
            ...(params !== undefined && { params })
        };
        this._sendMessage(notification);
    }

    // --- Internal Handlers ---

    _sendHandshakeResponse(sessionId, targetWindow, targetOrigin) {
        if (!targetWindow || !targetOrigin) {
            this._log("Internal error: Cannot send handshake response - client details missing.");
            // Reset state as we cannot proceed
            this.isConnected = false;
            this._pendingClientDetails = null;
            this.parentWindow = null;
            this.actualClientOrigin = null;
            return;
        }
        try {
            const responsePayload = { type: 'MCP_HANDSHAKE_SERVER', sessionId: sessionId };
            this._log(`Sending MCP_HANDSHAKE_SERVER to origin: ${targetOrigin}`);
            targetWindow.postMessage(responsePayload, targetOrigin);
        } catch (e) {
             this._log(`Error sending MCP_HANDSHAKE_SERVER: ${e.message || e}. Resetting connection state.`);
             // Reset state as the client will not receive the confirmation
             this.isConnected = false;
             this._pendingClientDetails = null;
             this.parentWindow = null;        // Clear potentially invalid reference
             this.actualClientOrigin = null;
        }
    }


    _handleInitialize(request) {
        this._log("Handling 'initialize'");
        const response = {
            jsonrpc: "2.0",
            id: request.id,
            result: {
                protocolVersion: "2024-11-05",
                capabilities: { tools: {} },
                serverInfo: this.serverInfo
            }
        };
        this._sendMessage(response);
    }

    _handleToolsList(request) {
        this._log("Handling 'tools/list'");
        const toolDefs = Array.from(this.tools.values()).map(t => t.definition);
        const response = {
            jsonrpc: "2.0",
            id: request.id,
            result: { tools: toolDefs }
        };
        this._sendMessage(response);
    }

    async _handleToolsCall(request) {
        const toolName = request.params?.name;
        const args = request.params?.arguments;
        const requestId = request.id;

        this._log(`Handling 'tools/call' for tool: ${toolName}`, args);
        const toolEntry = this.tools.get(toolName);

        if (!toolEntry) {
            this._log(`Tool not found: ${toolName}`);
            this._sendError(requestId, -32601, `Tool not found: ${toolName}`);
            return;
        }

        // --- Basic Argument Validation (Optional but Recommended) ---
        const schema = toolEntry.definition.inputSchema;
        if (schema && schema.required) {
            for (const requiredProp of schema.required) {
                if (args === undefined || args === null || args[requiredProp] === undefined) {
                    this._log(`Missing required argument '${requiredProp}' for tool ${toolName}`);
                    this._sendError(requestId, -32602, `Invalid params: Missing required argument '${requiredProp}' for tool ${toolName}.`, { schema });
                    return;
                }
            }
        }
        // Add more type checking based on schema.properties if needed

        // --- Execute Handler ---
        try {
            // Call the registered handler function
            // Expecting it to return { content: ToolResultContent[], isError: boolean }
            const handlerResult = await toolEntry.handlerFn(args || {});

            // Check what the handler returned and normalize it
            let finalContent;
            let finalIsError = false; // Default to success

            if (Array.isArray(handlerResult)) {
                // Handler returned just the content array - wrap it
                this._log(`Handler for ${toolName} returned content array directly. Wrapping.`);
                finalContent = handlerResult;
                // finalIsError remains false (default)
            } else if (typeof handlerResult === 'object' && handlerResult !== null && Array.isArray(handlerResult.content)) {
                // Handler returned the full structure { content: [], isError?: boolean }
                this._log(`Handler for ${toolName} returned full structure.`);
                finalContent = handlerResult.content;
                finalIsError = handlerResult.isError || false; // Use provided isError or default to false
            } else {
                // Handler returned an invalid structure
                this._log(`Invalid structure returned by handler for tool ${toolName} (expected Array or {{content: [], isError?: boolean}}):`, handlerResult);
                this._sendError(requestId, -32603, `Internal error: Invalid structure returned by tool handler ${toolName}.`);
                return;
            }

            // Validate nested content array
            if (!finalContent.every(item => typeof item === 'object' && item !== null && typeof item.type === 'string')) {
                this._log(`Invalid final content array structure for tool ${toolName}:`, finalContent);
                this._sendError(requestId, -32603, `Internal error: Invalid content array structure returned by tool handler ${toolName}.`);
                return;
            }

            // Send Success/Error Response
            this._sendMessage({
                jsonrpc: "2.0",
                id: requestId,
                result: { content: finalContent, isError: finalIsError }
            });

        } catch (error) {
            // --- Send Error Response (from handler execution exception) ---
            this._log(`Error executing handler for tool ${toolName}:`, error);
            // Send back an internal error, potentially including the message
            this._sendError(requestId, -32603, `Internal server error executing tool ${toolName}.`, { details: error.message });
        }
    }

     _handlePing(request) {
        this._log("Handling 'ping'");
        this._sendMessage({ jsonrpc: "2.0", id: request.id, result: {} });
    }

    // --- Messaging Helpers ---

    _sendMessage(payload) {
        if (!this.isConnected || !this.parentWindow || !this.actualClientOrigin) {
            this._log("Error sending: Connection not established or client details missing.");
            return;
        }
        try {
            this._log("Sending:", payload);
            // Send the object directly, postMessage handles serialization
            this.parentWindow.postMessage(payload, this.actualClientOrigin);
        } catch (error) {
            this._log("Error sending message via postMessage:", error, "Payload:", payload);
            // Consider if we need to handle errors here, e.g., disconnect?
        }
    }

    _sendError(id, code, message, data) {
        if (id !== undefined && id !== null && this.isConnected) {
            this._sendMessage({
                jsonrpc: "2.0",
                id: id,
                error: {
                    code: code,
                    message: message,
                    ...(data !== undefined && { data }) // Include data if provided
                }
            });
        } else {
            this._log(`Attempted to send error for request without ID or before connected. Code: ${code}, Message: ${message}`);
        }
    }
}

// Export the class
// If used via <script type="module">, this isn't strictly necessary
// but good practice if bundled later.
// export default MCPToolServer;
// If used via classic <script>, attach to window:
// window.MCPToolServer = MCPToolServer; 