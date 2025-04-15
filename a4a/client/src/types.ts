// --- JSON-RPC Base ---
export interface JsonRpcRequest<T = any> {
  jsonrpc: "2.0";
  id: string | number | null;
  method: string;
  params?: T;
}

export interface JsonRpcSuccessResponse<T = any> {
  jsonrpc: "2.0";
  id: string | number | null;
  result: T;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: any;
}

export interface JsonRpcErrorResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  error: JsonRpcError;
}

export type JsonRpcResponse<T = any> = JsonRpcSuccessResponse<T> | JsonRpcErrorResponse;

// --- A2A Core Objects ---

export type TaskState =
  | "submitted"
  | "working"
  | "input-required"
  | "completed"
  | "canceled"
  | "failed"
  | "unknown"; // Should be avoided

export interface TextPart {
  type: "text";
  text: string;
  metadata?: Record<string, any>;
}

export interface FilePart {
  type: "file";
  file: {
    name?: string;
    mimeType?: string;
    bytes?: string; // base64 encoded content
    uri?: string; // URI the agent needs to fetch
  };
  metadata?: Record<string, any>;
}

export interface DataPart {
  type: "data";
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

export type Part = TextPart | FilePart | DataPart;

export interface Message {
  id?: string; // Optional ID for message correlation
  role: "user" | "agent";
  parts: Part[];
  timestamp?: string; // ISO datetime value when message was created/added
  metadata?: Record<string, any>;
}

export interface Artifact {
  id?: string; // Optional ID assigned by server
  index: number; // Assigned by server, unique within task
  name?: string;
  description?: string;
  parts: Part[];
  append?: boolean; // For streaming: indicates appending to existing parts
  lastChunk?: boolean; // For streaming: indicates the last chunk for this artifact index
  timestamp?: string; // ISO datetime value
  metadata?: Record<string, any>;
}

export interface TaskStatus {
  state: TaskState;
  message?: Message; // e.g., reason for input-required, status update text
  timestamp: string; // ISO datetime value of last status change
}

export interface Task {
  id: string;
  sessionId?: string;
  status: TaskStatus;
  history?: Message[]; // Optional history
  artifacts?: Artifact[];
  // Store internal state separately if needed, don't expose everything
  internalState?: any;
  pushNotificationConfig?: PushNotificationConfig | null; // Added for storage
  metadata?: Record<string, any>;
  createdAt: string; // ISO datetime value
  updatedAt: string; // ISO datetime value
}


// --- Agent Card ---
export interface AgentCard {
  name: string;
  description: string;
  url: string; // Base URL where the agent A2A endpoint is hosted
  provider?: {
    organization: string;
    url: string;
  };
  version: string;
  documentationUrl?: string;
  capabilities: {
    streaming?: boolean;
    pushNotifications?: boolean;
    stateTransitionHistory?: boolean; // If server stores and returns TaskStatus changes
  };
  authentication: {
    schemes: string[]; // e.g., ["Bearer"], ["OAuth2"]
    credentials?: string; // Info for private cards if needed
  };
  defaultInputModes: string[]; // Mime types like "text/plain", "application/json"
  defaultOutputModes: string[]; // Mime types
  skills: {
    id: string;
    name: string;
    description: string;
    tags?: string[];
    examples?: string[];
    inputModes?: string[];
    outputModes?: string[];
  }[];
}

// --- A2A Method Params ---
export interface TaskSendParams {
  id?: string; // Optional: Client can suggest ID, server confirms/assigns final
  sessionId?: string;
  message: Message;
  historyLength?: number; // Hint for server response, server decides actual length
  pushNotification?: PushNotificationConfig;
  metadata?: Record<string, any>;
}

export interface TaskGetParams {
  id: string;
  historyLength?: number; // 0 for no history (default), >0 for N recent messages
  metadata?: Record<string, any>;
}

export interface TaskCancelParams {
  id: string;
  message?: Message; // Optional reason for cancellation
  metadata?: Record<string, any>;
}

export interface TaskPushNotificationParams {
  id: string;
  pushNotificationConfig?: PushNotificationConfig | null; // null to unset
}

export interface TaskPushNotificationGetParams {
  id: string;
}

// --- Push Notifications ---
export interface PushNotificationConfig {
  url: string; // Callback URL for the PushNotificationService
  token?: string; // Task/session specific token for authN/authZ at the callback URL
  authentication?: { // How the Payer Agent should authenticate to the callback URL
    schemes: string[]; // e.g., ["Bearer"], ["HMAC-SHA256"]
    credentials?: string; // Info for the agent (e.g., where to GET the Bearer token)
  };
  // Could add filter options here later (e.g., notify only on 'completed', 'failed')
}

// --- Streaming (Placeholder Types - SSE implementation not included yet) ---
export interface TaskStatusUpdateEvent {
  id: string; // Task ID
  status: TaskStatus;
  final: boolean;
  metadata?: Record<string, any>;
}

export interface TaskArtifactUpdateEvent {
  id: string; // Task ID
  artifact: Artifact; // Contains index, parts, append, lastChunk flags
  metadata?: Record<string, any>;
}

export interface TaskSubscribeParams extends TaskSendParams { }
export interface TaskResubscribeParams {
  id: string;
  metadata?: Record<string, any>;
}

// --- A2A Error Codes (subset) ---
export enum A2AErrorCodes {
    // JSON-RPC Standard
    ParseError = -32700,
    InvalidRequest = -32600,
    MethodNotFound = -32601,
    InvalidParams = -32602,
    InternalError = -32603,
    // A2A Specific (Server Errors -32000 to -32099)
    TaskNotFound = -32001,
    TaskCannotBeCanceled = -32002,
    PushNotificationsNotSupported = -32003,
    UnsupportedOperation = -32004,
    IncompatibleContentTypes = -32005,
    AuthenticationRequired = -32010, // Example custom
    AuthorizationFailed = -32011,   // Example custom
    ProcessorError = -32020,       // Error during task processing logic
}
