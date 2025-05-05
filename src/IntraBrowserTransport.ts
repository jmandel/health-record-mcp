import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { JSONRPCMessage, JSONRPCMessageSchema, McpError, ErrorCode, JSONRPCRequest } from "@modelcontextprotocol/sdk/types.js";

const HANDSHAKE_INTERVAL_MS = 200; // How often client sends handshake ping
const HANDSHAKE_TIMEOUT_MS = 15000; // Max time client waits for handshake response

// --- Setup Protocol Message Interfaces ---
/** =========  client ← iframe / window =========== */
export interface ServerSetupRequirements {
  type: 'SERVER_SETUP_REQUIREMENTS';
  /** Provider still needs a configuration step in a first‑party window */
  needsConfiguration: boolean;
  /** Provider needs Storage‑Access (document.requestStorageAccess())   */
  needsPermission: boolean;
}

export interface ServerPermissionResult {
  type: 'SERVER_PERMISSION_RESULT';
  granted: boolean;
}

export interface ServerConfigured {
  type: 'SERVER_CONFIGURED';
  success: boolean;         // true = user clicked "Save / Done"
  error?: string;           // optional detail if success === false
}

export interface ServerSetupError {
  type: 'SERVER_SETUP_ERROR';
  code: 'CONFIG_FAILED' | 'PERMISSION_DENIED' | 'UNEXPECTED';
  message: string;
}

/** =========  client → iframe / window  ========= */
export interface ClientTriggerPermission {
  type: 'CLIENT_TRIGGER_PERMISSION';   // no payload
}
// --- End Setup Protocol Message Interfaces ---


// --- Setup Helper Types ---

/** Hand‑over for UI events during setup */
export interface UiCallbacks {
  onRequirements(
    req: ServerSetupRequirements,
    actions: {
      openConfigure: () => void;      // call in **Configure** button
      triggerPermission: () => void;  // call in **Allow** button
    }
  ): void;
  /** Allows the setup helper to report status changes back to the UI */
  onStatusUpdate(status: 'configuring' | 'awaiting_permission' | 'error', message?: string): void;
}

/** Simplified error type for setup failures */
export class SetupError extends Error {
  constructor(public code: string, message: string) {
     super(message);
     this.name = 'SetupError'; // Optional: Set name for better debugging
  }
}

// --- End Setup Helper Types ---


// --- Helper Functions ---

// Type guard to check if a message is a valid JSON-RPC Request
function isJsonRpcRequest(obj: any): obj is JSONRPCRequest {
    return typeof obj === 'object' && obj !== null &&
           obj.jsonrpc === "2.0" &&
           typeof obj.method === 'string' &&
           (typeof obj.id === 'string' || typeof obj.id === 'number');
}

// Define specific types for handshake messages for clarity and type safety
type ClientHandshakeMessage = {
  type: "MCP_HANDSHAKE_CLIENT";
  clientOrigin: string;
  sessionId: string;
};
type ServerHandshakeMessage = {
  type: "MCP_HANDSHAKE_SERVER";
  sessionId: string;
};
// Combined type for type guards if needed, though checking 'type' is usually sufficient
// type HandshakeData = ClientHandshakeMessage | ServerHandshakeMessage;


// --- Client Transport (Runs in the Host/Parent Window) ---

/**
 * MCP Transport Client using window.postMessage to communicate with a server in an iframe.
 * This client creates and manages the iframe lifecycle.
 */
export class IntraBrowserClientTransport implements Transport {
  private iframeSrc: string;
  private serverOrigin: string; // The expected origin of the iframe content
  private clientOrigin: string; // This window's origin
  private iframeElement: HTMLIFrameElement | null = null;
  private iframeWindow: Window | null = null; // Direct reference to iframe's contentWindow

  private isConnected: boolean = false; // True ONLY after successful handshake
  private isStarting: boolean = false; // Flag to indicate start() process is active
  private startPromise: Promise<void> | null = null; // Tracks the completion of start()
  private startResolve: (() => void) | null = null; // Resolver for startPromise
  private startReject: ((reason?: any) => void) | null = null; // Rejecter for startPromise

  private handshakeIntervalId: number | null = null; // Timer for sending handshake pings
  private handshakeTimeoutId: number | null = null; // Timer for overall handshake timeout

  private messageQueue: JSONRPCMessage[] = []; // Queues messages sent before connection established
  public readonly sessionId: string = self.crypto.randomUUID(); // Client generates session ID

  // Event handlers defined by the Transport interface
  public onmessage?: ((message: JSONRPCMessage) => void);
  public onclose?: (() => void);
  public onerror?: ((error: Error) => void);

  /**
   * Creates a client transport that will communicate with an MCP server
   * loaded from the specified URL into a dynamically created iframe.
   * @param iframeSrc The URL to load into the iframe. Must be on the serverOrigin.
   * @param serverOrigin The expected origin of the server running in the iframe. Must be specific (not '*').
   */
  constructor(iframeSrc: string, serverOrigin: string) {
    console.log(`[ClientTransport ${this.sessionId}] Constructor`, { iframeSrc, serverOrigin });
    if (!iframeSrc) {
      throw new Error("iframeSrc must be provided");
    }
    if (!serverOrigin || serverOrigin === '*') {
      throw new Error("Specific serverOrigin must be provided for security (cannot be '*')");
    }
    try {
        const srcUrl = new URL(iframeSrc);
        if (srcUrl.origin !== serverOrigin) {
            console.warn(`[ClientTransport ${this.sessionId}] iframeSrc origin (${srcUrl.origin}) does not match provided serverOrigin (${serverOrigin}). This might cause issues.`);
        }
    } catch (e) {
        throw new Error(`Invalid iframeSrc URL: ${iframeSrc}`);
    }

    this.iframeSrc = iframeSrc;
    this.serverOrigin = serverOrigin;
    this.clientOrigin = window.location.origin;
    console.log(`[ClientTransport ${this.sessionId}] NEW INSTANCE CREATED`, { iframeSrc, serverOrigin, clientOrigin: this.clientOrigin });
  }

  /**
   * Creates the iframe, appends it to the DOM, starts the handshake process,
   * and resolves when the server acknowledges the handshake.
   */
  public start(): Promise<void> {
    console.log(`[ClientTransport ${this.sessionId}] start() called. isStarting=${this.isStarting}, isConnected=${this.isConnected}`);
    if (this.isStarting || this.isConnected) {
      console.warn(`[ClientTransport ${this.sessionId}] start() called while already starting or connected.`);
      return this.startPromise || Promise.resolve();
    }
    this.isStarting = true;
    console.log(`[ClientTransport ${this.sessionId}] start() proceeding...`);

    window.removeEventListener('message', this.handleMessage); // Clean up previous if any
    window.addEventListener('message', this.handleMessage);
    console.log(`[ClientTransport ${this.sessionId}] Global message listener added to parent window.`);


    this.startPromise = new Promise<void>((resolve, reject) => {
      this.startResolve = resolve;
      this.startReject = reject;

      try {
        console.log(`[ClientTransport ${this.sessionId}] Creating iframe element...`);
        this.iframeElement = document.createElement('iframe');
        // this.iframeElement.setAttribute('sandbox', 'allow-scripts'); // Minimal permissions
        this.iframeElement.style.display = 'none';

        this.iframeElement.onload = () => {
          console.log(`[ClientTransport ${this.sessionId}] Iframe loaded src: ${this.iframeSrc}`);
          // **Point 2 Fix**: Access contentWindow directly.
          if (!this.iframeElement?.contentWindow) {
            const err = new Error("Iframe loaded but contentWindow is null or inaccessible.");
            console.error(`[ClientTransport ${this.sessionId}]`, err);
            this.handleFatalError(err);
            return;
          }
          // Check accessibility (can throw cross-origin)
          try {
               this.iframeElement.contentWindow;
          } catch (crossOriginError) {
              const err = new Error(`Iframe contentWindow exists but seems inaccessible. Error: ${crossOriginError}`);
              console.error(`[ClientTransport ${this.sessionId}]`, err);
              this.handleFatalError(err);
              return;
          }

          this.iframeWindow = this.iframeElement.contentWindow;
          console.log(`[ClientTransport ${this.sessionId}] Iframe contentWindow acquired.`);
          this.initiateHandshake(); // Start pinging now window is ready
        };

        this.iframeElement.onerror = (event) => {
           const err = new Error(`Iframe loading failed for src ${this.iframeSrc}. Event: ${event}`);
           console.error(`[ClientTransport ${this.sessionId}] Iframe onerror triggered.`);
           this.handleFatalError(err);
        };

        this.iframeElement.src = this.iframeSrc;
        console.log(`[ClientTransport ${this.sessionId}] Appending iframe to DOM...`);
        document.body.appendChild(this.iframeElement);
        console.log(`[ClientTransport ${this.sessionId}] Iframe appended to DOM.`);

      } catch (error: any) {
        console.error(`[ClientTransport ${this.sessionId}] Error during iframe creation/setup:`, error);
        this.handleFatalError(error);
      }
    });

    return this.startPromise;
  }

  // Initiates the handshake process.
  private initiateHandshake() {
    console.log(`[ClientTransport ${this.sessionId}] Starting handshake process.`);
    this.cleanupHandshakeTimers();

    this.handshakeIntervalId = window.setInterval(this.sendHandshakePing, HANDSHAKE_INTERVAL_MS);
    this.handshakeTimeoutId = window.setTimeout(() => {
      const errorMsg = `Timeout (${HANDSHAKE_TIMEOUT_MS}ms) waiting for handshake response (MCP_HANDSHAKE_SERVER) from origin ${this.serverOrigin}`;
      console.error(`[ClientTransport ${this.sessionId}] ${errorMsg}`);
      this.cleanupHandshakeTimers();
      this.handleFatalError(new Error(errorMsg));
    }, HANDSHAKE_TIMEOUT_MS);

    this.sendHandshakePing(); // Send first ping
  }

  // Sends a single handshake ping message.
  private sendHandshakePing = () => {
    if (!this.iframeWindow || this.iframeWindow.closed) {
      console.warn(`[ClientTransport ${this.sessionId}] Cannot send handshake ping, iframe window not available or closed.`);
      if (this.iframeWindow?.closed) this.handleClose();
      return;
    }
    try {
      const handshakePayload: ClientHandshakeMessage = {
        type: 'MCP_HANDSHAKE_CLIENT',
        clientOrigin: this.clientOrigin,
        sessionId: this.sessionId
      };
      this.iframeWindow.postMessage(handshakePayload, this.serverOrigin);
    } catch (err: any) {
      console.warn(`[ClientTransport ${this.sessionId}] Error sending handshake ping: ${err.message || err}`);
      if (this.iframeWindow?.closed) this.handleClose();
    }
  }

  // Clears handshake interval and timeout timers.
  private cleanupHandshakeTimers = () => {
    if (this.handshakeIntervalId !== null) clearInterval(this.handshakeIntervalId);
    if (this.handshakeTimeoutId !== null) clearTimeout(this.handshakeTimeoutId);
    this.handshakeIntervalId = null;
    this.handshakeTimeoutId = null;
  }

  // Handles incoming messages from any source, performs validation.
  private handleMessage = (event: MessageEvent) => {
    // Security Checks: Origin and Source must match expected iframe
    if (event.origin !== this.serverOrigin) return;
    if (!this.iframeWindow || event.source !== this.iframeWindow) return;

    try {
      const messageData = event.data;

      // Handshake Handling
      if (typeof messageData === 'object' && messageData !== null && messageData.type === 'MCP_HANDSHAKE_SERVER') {
        const serverHandshake = messageData as ServerHandshakeMessage;
        console.log(`[ClientTransport ${this.sessionId}] Received MCP_HANDSHAKE_SERVER:`, serverHandshake);
        if (serverHandshake.sessionId !== this.sessionId) {
             console.warn(`[ClientTransport ${this.sessionId}] Handshake session ID mismatch. Expected ${this.sessionId}, got ${serverHandshake.sessionId}. Ignoring.`);
             return;
        }
        if (this.isStarting && !this.isConnected) {
             this.isConnected = true;
             this.isStarting = false;
             this.cleanupHandshakeTimers();
             console.log(`[ClientTransport ${this.sessionId}] Handshake successful! Transport connected.`);
             this.startResolve?.();
             this.flushQueue();
        } else {
             console.warn(`[ClientTransport ${this.sessionId}] Received handshake response but not in starting state or already connected.`);
        }
        return; // Handshake processed
      }

      // MCP Message Handling (Only if connected)
      if (!this.isConnected) {
        console.warn(`[ClientTransport ${this.sessionId}] Ignoring MCP message received before connection established:`, messageData);
        return;
      }
      if (typeof messageData !== 'object' || messageData === null || messageData.jsonrpc !== "2.0") {
         console.log(`[ClientTransport ${this.sessionId}] Ignoring non-JSON-RPC 2.0 message:`, messageData);
        return;
      }

      const parsed = JSONRPCMessageSchema.safeParse(messageData);
      if (!parsed.success) {
        const error = new Error("Received invalid JSON-RPC message structure: " + parsed.error.errors.map(e => e.message).join(', '));
        console.warn(`[ClientTransport ${this.sessionId}] ${error.message}`, { data: messageData, errorDetails: parsed.error });
        this.onerror?.(error);
        return;
      }

      // console.log(`[ClientTransport ${this.sessionId}] Received MCP message:`, parsed.data);
      if (this.onmessage) {
        this.onmessage(parsed.data);
      } else {
        console.warn(`[ClientTransport ${this.sessionId}] Received MCP message but onmessage handler is not set.`);
      }
    } catch (error: any) {
      console.error(`[ClientTransport ${this.sessionId}] Error processing received message:`, error);
      this.onerror?.(error);
    }
  };

  /**
   * Sends an MCP message to the server iframe. Queues if connection not yet established.
   */
  public async send(message: JSONRPCMessage): Promise<void> {
    if (!this.isConnected) {
      if (this.isStarting || !this.startPromise) {
        console.log(`[ClientTransport ${this.sessionId}] Queuing message (connection not ready):`, message);
        this.messageQueue.push(message);
        // **Point 3 Fix**: Check if it's a request before accessing .method
        if (isJsonRpcRequest(message) && message.method === 'initialize') {
          console.warn(`[ClientTransport ${this.sessionId}] ⚠️ Initialize request queued.`);
        }
        return;
      } else {
        const errorMsg = "Transport not connected or failed to start.";
        console.error(`[ClientTransport ${this.sessionId}] ${errorMsg}`);
        throw new McpError(ErrorCode.ConnectionClosed, errorMsg);
      }
    }

    if (!this.iframeWindow || this.iframeWindow.closed) {
      const errorMsg = "Cannot send message: Target iframe window is closed or inaccessible.";
      console.error(`[ClientTransport ${this.sessionId}] ${errorMsg}`);
      this.handleClose();
      throw new McpError(ErrorCode.ConnectionClosed, errorMsg);
    }

    try {
      // console.log(`[ClientTransport ${this.sessionId}] Sending MCP message to ${this.serverOrigin}:`, message);
      this.iframeWindow.postMessage(message, this.serverOrigin);
    } catch (err: any) {
      const errorMsg = `Failed to send message via postMessage: ${err.message || err}`;
      console.error(`[ClientTransport ${this.sessionId}] ${errorMsg}`);
      const error = new Error(errorMsg);
      this.onerror?.(error);
      this.handleClose();
      throw error;
    }
  }

  // Sends all messages queued before the connection was ready.
  private flushQueue() {
    if (this.messageQueue.length > 0) {
        console.log(`[ClientTransport ${this.sessionId}] Flushing ${this.messageQueue.length} queued messages.`);
    }
    const errors: Error[] = [];
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message).catch(err => {
            console.error(`[ClientTransport ${this.sessionId}] Error sending queued message:`, err);
            errors.push(err instanceof Error ? err : new Error(String(err)));
        });
      }
    }
    errors.forEach(err => this.onerror?.(err));
  }

  // Handles fatal errors during startup, ensuring cleanup and rejection.
  private handleFatalError(error: Error) {
    this.onerror?.(error);
    if (this.isStarting && this.startReject) {
      this.startReject(error); // Reject the pending start promise
    }
    this.close(); // Trigger full cleanup
  }

  // Centralized cleanup logic, safe to call multiple times.
  private handleClose() {
    const wasActive = this.isStarting || this.isConnected;
    if (!wasActive && !this.startPromise) return; // Already inactive

    console.log(`[ClientTransport ${this.sessionId}] Closing connection and cleaning up resources.`);
    this.isConnected = false;
    this.isStarting = false;

    this.cleanupHandshakeTimers();
    // **Point 1 Clarification**: Removing listener from *our own window*.
    window.removeEventListener('message', this.handleMessage);

    if (this.iframeElement) {
      if (this.iframeElement.parentNode) {
        console.log(`[ClientTransport ${this.sessionId}] Removing iframe from DOM.`);
        this.iframeElement.parentNode.removeChild(this.iframeElement);
      }
      this.iframeElement = null;
    }
    this.iframeWindow = null;

    if (this.startReject) {
      this.startReject(new McpError(ErrorCode.ConnectionClosed, "Transport closed during startup or due to error."));
    }
    this.startPromise = null;
    this.startResolve = null;
    this.startReject = null;

    if (this.messageQueue.length > 0) {
      console.warn(`[ClientTransport ${this.sessionId}] Discarding ${this.messageQueue.length} queued messages on close.`);
      this.messageQueue = [];
    }

    // Only call onclose if we were previously active
    if (wasActive) {
        this.onclose?.();
    }
  }

  /**
   * Closes the connection and cleans up resources, including removing the iframe if created by this transport.
   */
  public async close(): Promise<void> {
    this.handleClose();
  }
}


// --- Server Transport (Runs Inside the Iframe) ---

/**
 * MCP Transport Server running inside an iframe, communicating with a client
 * in the parent window via window.postMessage(). Handles multiple trusted client origins.
 */
export class IntraBrowserServerTransport implements Transport {
  private trustedClientOrigins: Set<string>; // Allowed parent origins
  private clientWindow: Window | null = null; // Reference to the specific connected parent window
  private actualClientOrigin: string | null = null; // Specific origin of the connected client
  private isConnected: boolean = false; // True only after successful handshake

  // Session ID is adopted from the client during handshake
  public sessionId: string = `server-pending-${self.crypto.randomUUID()}`;

  // --- Async start() tracking ---
  private isStarting: boolean = false;
  private startPromise: Promise<void> | null = null;
  private startResolve: (() => void) | null = null;
  private startReject: ((reason?: any) => void) | null = null;
  private handshakeTimeoutId: number | null = null;

  // Event handlers defined by the Transport interface
  public onmessage?: ((message: JSONRPCMessage) => void);
  public onclose?: (() => void);
  public onerror?: ((error: Error) => void);

  /**
   * Creates a server transport that expects communication from specific client origins.
   * @param trustedClientOrigins An array or Set of exact origins (e.g., ['https://client-a.com', 'https://client-b.com'])
   *                             that are allowed to initiate a connection. '*' is explicitly disallowed.
   */
  constructor({trustedClientOrigins}: {trustedClientOrigins: string | string[] | Set<string>}) {
    // Accept "*" as a special wildcard meaning "allow any origin".
    const originsArray = Array.from(typeof trustedClientOrigins === 'string' ? [trustedClientOrigins] : trustedClientOrigins).filter(Boolean);

    const hasWildcard = originsArray.includes('*');
    const uniqueOrigins = new Set(hasWildcard ? ['*'] : originsArray);

    if (uniqueOrigins.size === 0) {
      console.error(`[ServerTransport ${this.sessionId}] Constructor - No trusted origins provided.`, trustedClientOrigins);
      throw new Error("At least one trustedClientOrigin must be provided.");
    }

    this.trustedClientOrigins = uniqueOrigins;
    console.log(`[ServerTransport ${this.sessionId}] Constructor - Trusted Origins:`, Array.from(this.trustedClientOrigins));

    // **Point 1 Clarification**: Add listener to *this iframe's window* to receive
    // messages sent *to it* from the parent via `parent.postMessage()`.
    window.removeEventListener('message', this.handleMessage); // Ensure no duplicates
    window.addEventListener('message', this.handleMessage);
    console.log(`[ServerTransport ${this.sessionId}] Global message listener added to iframe window.`);
  }

  /**
   * Completes initialization. Resolves immediately as the server is ready
   * to listen once its script is running. The actual connection waits for the client handshake.
   */
  public async start(): Promise<void> {
    if (this.isConnected) {
      // Already connected (handshake happened very quickly)
      return Promise.resolve();
    }

    // If we're already waiting, return the same promise
    if (this.isStarting && this.startPromise) {
      return this.startPromise;
    }

    console.log(`[ServerTransport ${this.sessionId}] start() called. Waiting for MCP_HANDSHAKE_CLIENT...`);

    this.isStarting = true;

    this.startPromise = new Promise<void>((resolve, reject) => {
      this.startResolve = resolve;
      this.startReject = reject;

      // Timeout to avoid waiting forever
      this.handshakeTimeoutId = window.setTimeout(() => {
        const errorMsg = `Timeout (${HANDSHAKE_TIMEOUT_MS}ms) waiting for client handshake.`;
        console.error(`[ServerTransport ${this.sessionId}] ${errorMsg}`);
        this.isStarting = false;
        this.startReject?.(new Error(errorMsg));
        // Clean up listener/ state
        this.close().catch(() => {});
      }, HANDSHAKE_TIMEOUT_MS);
    });

    return this.startPromise;
  }

  // Handles incoming messages from the parent window.
  private handleMessage = (event: MessageEvent) => {
    // Security Checks: Source and Origin
    if (!event.source || event.source !== window.parent) return; // Must be parent

    let originToCheck: string | null = null;
    let isHandshake = false;
    let messageData: any = null; // Use 'any' temporarily for initial type check

    // Try to determine if it's a potential handshake message first
    if (typeof event.data === 'object' && event.data !== null && event.data.type === 'MCP_HANDSHAKE_CLIENT') {
        isHandshake = true;
        messageData = event.data; // Assume it's HandshakeData for now
        // If a wildcard ("*") is present, accept any origin. Otherwise, ensure the origin is explicitly trusted.
        if (!this.trustedClientOrigins.has('*') && !this.trustedClientOrigins.has(event.origin)) {
            console.warn(`[ServerTransport ${this.sessionId}] Ignoring handshake: Origin ${event.origin} is not in trusted list.`, Array.from(this.trustedClientOrigins));
            return;
        }
        // Origin is trusted for handshake
    } else if (this.isConnected) {
        // If already connected, check against the *established* client origin
        originToCheck = this.actualClientOrigin;
        if (event.origin !== originToCheck) {
            console.warn(`[ServerTransport ${this.sessionId}] Ignoring message: Origin ${event.origin} does not match established client origin ${originToCheck}.`);
            return;
        }
        messageData = event.data; // Assign data for MCP processing
    } else {
        // Not a handshake and not connected - ignore
        return;
    }
    // --- End Security Checks ---

    try {
      // --- Handshake Handling ---
      if (isHandshake) {
        const clientHandshake = messageData as ClientHandshakeMessage; // Cast is safer now
        console.log(`[ServerTransport ${this.sessionId}] Received MCP_HANDSHAKE_CLIENT from trusted origin ${event.origin}:`, clientHandshake);

        if (!this.isConnected) {
          try { new URL(clientHandshake.clientOrigin); } catch { /* ignore format error */ }
          this.actualClientOrigin = event.origin; // Store the *validated* event origin
          this.clientWindow = event.source as Window;
          (this as { -readonly [K in keyof this]: this[K] }).sessionId = clientHandshake.sessionId;
          console.log(`[ServerTransport ${this.sessionId}] Handshake accepted. Stored client origin: ${this.actualClientOrigin}, Session ID: ${this.sessionId}`);
          this.sendHandshakeResponse();
          this.isConnected = true;

          // Resolve start() promise if we are waiting for handshake
          if (this.isStarting) {
            this.isStarting = false;
            if (this.handshakeTimeoutId !== null) clearTimeout(this.handshakeTimeoutId);
            this.startResolve?.();
          }
        } else if (this.actualClientOrigin === event.origin) {
          console.warn(`[ServerTransport ${this.sessionId}] Received duplicate handshake from connected origin ${this.actualClientOrigin}. Responding again.`);
          this.sendHandshakeResponse();
        } else {
          console.warn(`[ServerTransport ${this.sessionId}] Ignoring handshake from ${event.origin}, already connected to ${this.actualClientOrigin}.`);
        }
        return; // Handshake processed
      }
      // --- End Handshake Handling ---

      // --- MCP Message Handling ---
      // Should only reach here if isConnected is true and origin matched actualClientOrigin
       if (typeof messageData !== 'object' || messageData === null || messageData.jsonrpc !== "2.0") {
            console.log(`[ServerTransport ${this.sessionId}] Ignoring non-JSON-RPC 2.0 message:`, messageData);
           return;
       }

      const parsed = JSONRPCMessageSchema.safeParse(messageData);
      if (!parsed.success) {
        const error = new Error("Received invalid JSON-RPC message structure: " + parsed.error.errors.map(e => e.message).join(', '));
        console.warn(`[ServerTransport ${this.sessionId}] ${error.message}`, { data: messageData, errorDetails: parsed.error });
        this.onerror?.(error);
        return;
      }

      // console.log(`[ServerTransport ${this.sessionId}] Received MCP message:`, parsed.data);
      if (this.onmessage) {
        this.onmessage(parsed.data);
      } else {
        console.warn(`[ServerTransport ${this.sessionId}] Received MCP message but onmessage handler is not set.`);
      }

    } catch (error: any) {
      console.error(`[ServerTransport ${this.sessionId}] Error processing received message:`, error);
      this.onerror?.(error);
    }
  };

  // Sends the handshake acknowledgement back to the specific client origin.
  private sendHandshakeResponse() {
    if (!this.clientWindow || !this.actualClientOrigin) {
      console.error(`[ServerTransport ${this.sessionId}] Internal error: Cannot send handshake response - client details unknown.`);
      return;
    }
    try {
      const responsePayload: ServerHandshakeMessage = { type: 'MCP_HANDSHAKE_SERVER', sessionId: this.sessionId };
      console.log(`[ServerTransport ${this.sessionId}] Sending MCP_HANDSHAKE_SERVER to specific origin: ${this.actualClientOrigin}`);
      this.clientWindow.postMessage(responsePayload, this.actualClientOrigin); // Target specific origin
    } catch (e: any) {
      console.error(`[ServerTransport ${this.sessionId}] Error sending MCP_HANDSHAKE_SERVER: ${e.message || e}`);
      this.onerror?.(e instanceof Error ? e : new Error(String(e)));
    }
  }

  /**
   * Sends an MCP message to the connected client (parent window) using the specific client origin.
   */
  public async send(message: JSONRPCMessage): Promise<void> {
    if (!this.isConnected || !this.clientWindow || !this.actualClientOrigin) {
      const errorMsg = 'Cannot send message: Connection not established or client origin unknown.';
      console.error(`[ServerTransport ${this.sessionId}] ${errorMsg}`);
      throw new McpError(ErrorCode.ConnectionClosed, errorMsg);
    }

    let parentClosed = false;
    try { parentClosed = this.clientWindow.closed; } catch (e) { parentClosed = true; }
    if (parentClosed) {
      const errorMsg = "Cannot send message: Client window is closed.";
      console.error(`[ServerTransport ${this.sessionId}] ${errorMsg}`);
      this.handleClose();
      throw new McpError(ErrorCode.ConnectionClosed, errorMsg);
    }

    try {
      // console.log(`[ServerTransport ${this.sessionId}] Sending MCP message to ${this.actualClientOrigin}:`, message);
      this.clientWindow.postMessage(message, this.actualClientOrigin); // Target specific origin
    } catch (err: any) {
      const errorMsg = `Failed to send message via postMessage: ${err.message || err}`;
      console.error(`[ServerTransport ${this.sessionId}] ${errorMsg}`);
      const error = new Error(errorMsg);
      this.onerror?.(error);
      this.handleClose(); // Assume connection broken
      throw error;
    }
  }

  // Centralized cleanup logic, safe to call multiple times.
  private handleClose() {
    const wasConnected = this.isConnected;
    const wasStarting = this.isStarting;
    if (!wasConnected && !wasStarting) return; // Already inactive

    console.log(`[ServerTransport ${this.sessionId}] Closing connection.`);
    this.isConnected = false;
    this.isStarting = false;
    if (this.handshakeTimeoutId !== null) clearTimeout(this.handshakeTimeoutId);

     // **Point 1 Clarification**: Removing listener from *this iframe's window*.
    window.removeEventListener('message', this.handleMessage);
    this.clientWindow = null;
    this.actualClientOrigin = null;

    // Reject start promise if we're closing during startup
    if (wasStarting && this.startReject) {
        this.startReject(new Error('Transport closed before handshake completed.'));
    }

    // Only call onclose if we were previously connected
    if (wasConnected) {
        this.onclose?.();
    }
  }

  /**
   * Closes the connection from the server side and removes the message listener.
   */
  public async close(): Promise<void> {
    this.handleClose();
  }
}