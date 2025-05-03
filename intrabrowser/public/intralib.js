/**
 * MCP Tool Server Client Library (for iframe using postMessage)
 * Simplifies implementing MCP server logic within a tool iframe.
 */
export default class MCPToolServer {
    constructor(config = {}) {
        this.serverInfo = config.serverInfo || { name: "mcp-tool", version: "0.0.0" };
        this.targetOrigin = config.targetOrigin || '*'; // SECURITY: Defaulting to '*' is insecure for production!
        this.tools = new Map(); // Stores { definition, handlerFn }
        this.parentWindow = null; // Will be set on first message or if pre-set
        this.debug = config.debug || false;

        // Track whether initialize has been processed
        this._initialized = false;
        // Interval ID for repeated ready signals
        this._readyInterval = null;

        if (this.targetOrigin === '*') {
            console.warn("MCPToolServer initialized with targetOrigin '*'. This is insecure and should ONLY be used for local development. Set a specific origin in production.");
        }

        this._log(`Initializing MCPToolServer with origin: ${this.targetOrigin}`);
        this._attachListener();
    }

    _log(message, ...args) {
        if (this.debug) {
            console.log(`[MCPToolServer Lib] ${message}`, ...args);
        }
    }

    _attachListener() {
        window.addEventListener('message', this._handleMessage.bind(this));
        this._log("Attached message listener.");
    }

    _handleMessage(event) {
        // --- Origin Validation ---
        if (this.targetOrigin !== '*' && event.origin !== this.targetOrigin) {
            this._log(`Ignoring message from invalid origin: ${event.origin}. Expected: ${this.targetOrigin}`);
            return;
        }

        // --- Store Parent Reference ---
        // Store on first valid message or if origin is '*'
        if (!this.parentWindow && event.source) {
            this.parentWindow = event.source;
            this._log(`Stored parent window reference (origin: ${event.origin})`);
            // If origin was '*', update it to the specific sender's origin for future sends
            // Note: This assumes the first message is from the intended parent.
            if (this.targetOrigin === '*') {
                 // Re-check: Only set if it's not the iframe itself sending a message?
                 if (event.source !== window) {
                    this.targetOrigin = event.origin;
                    this._log(`Updated targetOrigin to specific sender: ${this.targetOrigin}`);
                 } else {
                     this._log("Received message from self, not updating targetOrigin yet.");
                     // Potentially ignore messages from self if not expected
                 }
            }
        } else if (this.parentWindow && event.source !== this.parentWindow) {
            this._log(`Warning: Received message from a different source (${event.origin}) than the initial parent (${this.targetOrigin}). Ignoring.`);
            // This prevents other iframes/windows on the same origin (if targetOrigin='*') from hijacking
            return;
        }


        // --- Parsing & Basic Validation ---
        let message;
        if (typeof event.data !== 'string') {
            this._log("Ignoring non-string message data:", event.data);
            return; // MCP expects stringified JSON
        }
        try {
            message = JSON.parse(event.data);
            this._log("Received Parsed:", message);
        } catch (e) {
            this._log("Failed to parse JSON:", e, "Data:", event.data.substring(0, 100));
            // Cannot send Parse Error (-32700) without a valid request ID
            return;
        }

        // --- JSON-RPC Request Validation ---
        const isValidRequest = typeof message === 'object' && message !== null &&
                              typeof message.method === 'string' &&
                              message.id !== undefined && message.id !== null; // Allow id: 0

        const isNotification = typeof message === 'object' && message !== null &&
                              typeof message.method === 'string' &&
                              message.id === undefined;


        if (!isValidRequest && !isNotification) {
            this._log("Ignoring invalid/unrecognized message structure:", message);
            // Cannot send Invalid Request (-32600) without a valid request ID
            return;
        }
        
        if(isNotification) {
             this._log(`Received notification ${message.method}, ignoring.`);
             // Could add notification handlers later if needed
             return;
        }

        // --- Routing ---
        try {
            switch (message.method) {
                case "initialize":
                    this._handleInitialize(message);
                    break;
                case "tools/list":
                    this._handleToolsList(message);
                    break;
                case "tools/call":
                    // Use Promise.resolve to handle both sync and async handlers gracefully
                    Promise.resolve(this._handleToolsCall(message))
                        .catch(err => {
                            // Catch errors *during* the handler lookup/execution
                            this._log(`Internal error during tools/call handling for ID ${message.id}:`, err);
                            this._sendError(message.id, -32603, "Internal server error processing tool call.", { details: err.message });
                        });
                    break;
                case "ping":
                    this._handlePing(message);
                    break;
                // Add other standard MCP methods here if needed (shutdown, etc.)
                default:
                    this._log(`Unknown method: ${message.method}`);
                    this._sendError(message.id, -32601, `Method not found: ${message.method}`);
                    break;
            }
        } catch (err) {
             // Catch synchronous errors in the routing/handler logic itself
             this._log(`Internal error processing request ID ${message.id}:`, err);
             this._sendError(message.id, -32603, "Internal server error processing request.", { details: err.message });
        }
    }

    // --- Public API Methods ---

    /**
     * Registers a tool and its handler function.
     * @param {object} toolDefinition - Tool definition (name, description, inputSchema, etc.)
     * @param {Function} handlerFn - Async function(args): Promise<ToolResultContent[]>
     */
    registerTool(toolDefinition, handlerFn) {
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
     * Sends a JSON-RPC notification to the parent.
     * @param {string} method - The notification method name (e.g., 'tool_status')
     * @param {object} [params] - Optional parameters for the notification.
     */
    sendNotification(method, params) {
        if (!method) return;
        const notification = {
            jsonrpc: "2.0",
            method: method,
            ...(params !== undefined && { params })
        };
        this._sendMessage(notification);
    }

    /**
     * Explicitly signal to parent window that this server is ready to handle requests.
     * Call this after registering all tools.
     */
    sendReadySignal() {
        this._log("Sending ready signal to parent");
        try {
            const readyMsg = JSON.stringify({ jsonrpc: "2.0", method: "server_ready" });
            if (window.parent && window.parent !== window) {
                window.parent.postMessage(readyMsg, this.targetOrigin);
                this._log("Sent 'server_ready' notification to parent.");
                // Kick off interval to keep sending until initialize arrives
                if (this._readyInterval === null) {
                    this._readyInterval = setInterval(() => {
                        if (this._initialized) {
                            clearInterval(this._readyInterval);
                            this._readyInterval = null;
                            return;
                        }
                        this._log("Re-sending 'server_ready' notification (awaiting initialize)...");
                        try {
                            window.parent.postMessage(readyMsg, this.targetOrigin);
                        } catch (e) {
                            this._log("Error re-sending server_ready", e);
                        }
                    }, 500);
                }
                return true;
            }
        } catch(e) {
            this._log("Error sending server_ready notification", e);
        }
        return false;
    }

    // --- Internal Handlers ---

    _handleInitialize(request) {
        this._log("Handling 'initialize'");
        // Mark that initialize has been received; stop ready interval
        this._initialized = true;
        if (this._readyInterval !== null) {
            clearInterval(this._readyInterval);
            this._readyInterval = null;
        }
        const response = {
            jsonrpc: "2.0",
            id: request.id,
            result: {
                protocolVersion: "2024-11-05", // Align with spec date used elsewhere
                capabilities: {
                    // Derive capabilities from registered tools
                    tools: {} // For now, just indicate tool support exists
                    // Add other capabilities if supported (prompts, resources, etc.)
                },
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
            result: {
                tools: toolDefs
                // nextCursor: undefined // Pagination not implemented
            }
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

            // --- Validate Handler Result Wrapper ---
            if (typeof handlerResult !== 'object' || handlerResult === null || !Array.isArray(handlerResult.content)) {
                this._log(`Invalid structure returned by handler for tool ${toolName} (expected {{content: [], isError: boolean}}):`, handlerResult);
                this._sendError(requestId, -32603, `Internal error: Invalid structure returned by tool handler ${toolName}.`);
                return;
            }
            const resultContent = handlerResult.content;
            const resultIsError = handlerResult.isError || false;

            // --- Validate nested content array ---
            if (!resultContent.every(item => typeof item === 'object' && item !== null && typeof item.type === 'string')) {
                 this._log(`Invalid content array structure returned by handler for tool ${toolName}:`, resultContent);
                 this._sendError(requestId, -32603, `Internal error: Invalid content array structure returned by tool handler ${toolName}.`);
                 return;
            }

            // --- Send Success/Error Response based on handler result ---
            this._sendMessage({
                jsonrpc: "2.0",
                id: requestId,
                result: {
                    content: resultContent, // Use the validated content
                    isError: resultIsError  // Use the isError flag from the handler
                }
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
        this._sendMessage({
            jsonrpc: "2.0",
            id: request.id,
            result: {} // Empty result indicates success
        });
    }

    // --- Messaging Helpers ---

    _sendMessage(payload) {
        if (!this.parentWindow) {
            this._log("Error sending: Parent window reference not available.");
            // Maybe queue message? For now, just log error.
            return;
        }
        try {
            const messageString = JSON.stringify(payload);
            this._log("Sending:", payload);
            this.parentWindow.postMessage(messageString, this.targetOrigin);
        } catch (error) {
            this._log("Error stringifying or sending message:", error, "Payload:", payload);
            // If it was an error response we failed to send, we can't do much else
        }
    }

    _sendError(id, code, message, data) {
        // Only send error if ID is valid (was part of a valid request)
        if (id !== undefined && id !== null) {
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
            this._log(`Attempted to send error for request without ID. Code: ${code}, Message: ${message}`);
        }
    }
}

// Export the class
// If used via <script type="module">, this isn't strictly necessary
// but good practice if bundled later.
// export default MCPToolServer;
// If used via classic <script>, attach to window:
// window.MCPToolServer = MCPToolServer; 