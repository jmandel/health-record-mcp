/**
 * MCP Intra‑Browser Proxy – Bun‑powered Express version
 *
 *  • 401 + WWW‑Authenticate on the SSE route
 *  • OAuth code grant (one tab bounce) — no device flow
 *  • A *single* tool iframe at a time → simpler stream routing
 *  • Full duplex streaming between MCP Streamable HTTP and WebSocket (browser UI)
 */

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { randomUUID } from "crypto";
import { WebSocketServer, WebSocket } from "ws";
import { createServer, IncomingMessage } from "http";
import path from "node:path";
import { parse } from "node:url";

/* ------------------------------------------------------------------ */
/*  1 – in‑memory session registry                                    */
/* ------------------------------------------------------------------ */
// --- Type helper for JSON RPC Messages ---
interface JsonRpcMessage {
    jsonrpc: "2.0";
    id?: string | number;
    method?: string;
    params?: any;
    result?: any;
    error?: any;
}

interface Session {
  token: string;
  code?: string;
  sse?: Response;
  ws?: WebSocket;
  toSSE: string[];  // queued → Client (via GET /mcp)
  toWS:  string[];  // queued → UI (via WebSocket)
  postResponses: Map<string | number, Response>;
}
const sessions = new Map<string, Session>();

// Helper: ensure session exists for a given config key
function ensureSession(config: string): Session {
  let sess = sessions.get(config);
  if (!sess) {
    sess = { token: config, toSSE: [], toWS: [], postResponses: new Map() } as Session;
    sessions.set(config, sess);
  }
  return sess;
}

/* ------------------------------------------------------------------ */
/*  2 – express on Bun                                                */
/* ------------------------------------------------------------------ */
// Define handler type explicitly to satisfy linter
// Make return type `any` to accommodate various ways handlers can end
type ExpressHandler = (req: Request, res: Response, next?: NextFunction) => any;

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.resolve("public")));   // serves index.html + js

// Detailed Request Logging Middleware
const loggingMiddleware: ExpressHandler = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
`--------------------------------------------------
[REQ LOG] ${new Date().toISOString()}
  Method:  ${req.method}
  URL:     ${req.originalUrl}
  Status:  ${res.statusCode}
  IP:      ${req.ip || req.socket.remoteAddress}
  Headers: ${JSON.stringify(req.headers, null, 2)}
  Query:   ${JSON.stringify(req.query, null, 2)}
  Body:    ${req.body ? JSON.stringify(req.body, null, 2) : 'N/A'}
  Duration: ${duration}ms
--------------------------------------------------`
    );
  });
  if (next) {
    next();
  }
};
app.use(loggingMiddleware);

const http = createServer(app);

/* ----------  OAuth, DCR, Well-Known (Explicit Handler Types) ----------- */

// Fix linter errors by explicitly typing handlers
const authorizeHandler: ExpressHandler = (req, res) => {
  const { client_id, redirect_uri, state } = req.query;
  if (!client_id || !redirect_uri) return res.sendStatus(400);

  const sess = ensureSession(req.params.config || "global");
  const code = randomUUID();
  sess.code  = code;

  // Store parameters for the script
  const toolUrl = `/?token=${sess.token}`;
  const redirectUriString = String(redirect_uri); // Ensure it's a string
  const stateString = state !== undefined ? String(state) : undefined;

  res.type("html").send(/* html */`
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCP Proxy Authorization</title>
  <style>
    body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; flex-direction: column; }
    button { padding: 10px 20px; font-size: 16px; cursor: pointer; }
  </style>
</head>
<body>
  <h1>Authorize Access</h1>
  <p>Click the button below to authorize the client and open the MCP tool interface.</p>
  <button id="authorizeBtn">Authorize and Open Tool</button>

<script>
    const toolUrl = ${JSON.stringify(toolUrl)};
    const redirectUriBase = ${JSON.stringify(redirectUriString)};
    const code = ${JSON.stringify(code)};
    const state = ${JSON.stringify(stateString)}; // Will be null if undefined

    document.getElementById('authorizeBtn').addEventListener('click', () => {
      // 1. Open the tool tab
      window.open(toolUrl, '_blank', 'popup');

      // 2. Construct the redirect URL
      const redirectUrl = new URL(redirectUriBase, window.location.origin);
      redirectUrl.searchParams.set('code', code);
      if (state !== null && state !== undefined) {
          redirectUrl.searchParams.set('state', state);
      }

      // 3. Redirect the current tab to complete the OAuth flow
      window.location.href = redirectUrl.toString();
    });
  </script>
</body>
</html>`);
};
app.get("/oauth/authorize", authorizeHandler);

const tokenHandler: ExpressHandler = (req, res) => {
  const { code, grant_type } = req.body;
  if (grant_type !== "authorization_code") return res.sendStatus(400);
  const token = ensureSession(req.params.config || "global").code;
  if (!token) return res.status(400).json({ error: "invalid_grant" });
  ensureSession(req.params.config || "global").code = undefined;
  res.json({ access_token: token, token_type: "Bearer", expires_in: 3600 });
};
app.post("/oauth/token", tokenHandler);

const dcrHandler: ExpressHandler = (req, res) => {
  const { client_name, redirect_uris, grant_types, response_types, token_endpoint_auth_method, scope } = req.body;
  console.log("[DCR] Received registration request:", req.body);
  const clientId = `client-${randomUUID()}`;
  const responseBody = {
    client_id: clientId,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    ...(redirect_uris && { redirect_uris }),
    ...(grant_types && { grant_types }),
    ...(response_types && { response_types }),
    ...(token_endpoint_auth_method && { token_endpoint_auth_method }),
    ...(scope && { scope }),
    registration_access_token: `reg-${randomUUID()}`,
    registration_client_uri: `/register/${clientId}`,
  };
  console.log("[DCR] Responding with:", responseBody);
  res.status(201).json(responseBody);
};
app.post("/register", dcrHandler);

const wellKnownHandler: ExpressHandler = (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers.host;
  const baseUrl = `${protocol}://${host}`;
  const metadata = {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/oauth/authorize`,
    token_endpoint: `${baseUrl}/oauth/token`,
    registration_endpoint: `${baseUrl}/register`,
    scopes_supported: ["mcp"],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
  };
  res.json(metadata);
};
app.get("/.well-known/oauth-authorization-server", wellKnownHandler);

/* ----------  MCP Streamable HTTP Endpoint (/mcp) ----------------- */

// Derive config key from request params or query (default "global")
function extractConfig(req: Request): string {
  return (req.params as any)?.config || (req.query?.config as string) || "global";
}

// GET /mcp or /:config/mcp : Establishes the persistent stream
const mcpGetHandler: ExpressHandler = (req, res) => {
  const configKey = extractConfig(req);
  const sess = ensureSession(configKey);

  console.log(`[GET /mcp] Request for config '${configKey}'`);

  if (sess.sse) {
    try { sess.sse.end(); } catch {}
    sess.sse = undefined;
    console.log(`[GET /mcp] Replaced existing SSE stream for config '${configKey}'.`);
  }

  console.log(`[GET /mcp] Establishing SSE stream for config '${configKey}'.`);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.write(":\n\n");

  sess.sse = res;
  console.log(`[GET /mcp] SSE connection stored for session. Flushing ${sess.toSSE.length} queued messages.`);
  sess.toSSE.splice(0).forEach(m => {
      console.log(`[GET /mcp] Writing queued message to SSE:`, m.substring(0,100));
      res.write(`data: ${m}\n\n`);
  });

  res.on("close", () => {
      console.log(`[GET /mcp] SSE connection closed for token ${configKey.substring(0, 6)}...`);
      const currentSess = sessions.get(configKey);
      if (currentSess && currentSess.sse === res) {
         currentSess.sse = undefined;
      }
  });
};
app.get("/mcp", mcpGetHandler);
app.get("/:config/mcp", mcpGetHandler);

// POST /mcp : Receives client-to-server messages
const mcpPostHandler: ExpressHandler = (req, res) => {
  const configKey = extractConfig(req);
  const sess = ensureSession(configKey);

  console.log(`[POST /mcp] Request for config '${configKey}'`);

  if (!sess) {
    console.log(`[POST /mcp] Session not found for config.`);
    res.setHeader("WWW-Authenticate",
      'Bearer realm="mcp-proxy", scope="mcp",' +
      ' authorization_uri="/oauth/authorize", token_uri="/oauth/token"');
    console.log(`[POST /mcp] Sending 401 Unauthorized response.`);
 
    return res.status(401).json({ error: "invalid_token", error_description: "Invalid or expired token." });
  }

  const messages: JsonRpcMessage[] = Array.isArray(req.body) ? req.body : [req.body];
  const requestMessages = messages.filter(msg => msg && msg.id !== undefined && msg.method !== undefined);
  const hasRequests = requestMessages.length > 0;
  const requestIds = requestMessages.map(msg => msg.id);

  console.log(`[POST /mcp] Received ${messages.length} message(s). Contains requests: ${hasRequests}`);

  const payload = JSON.stringify(req.body);
  console.log(`[POST /mcp] Forwarding payload to WS if connected:`, payload.substring(0, 200) + (payload.length > 200 ? '...' : ''));
  if (sess.ws && sess.ws.readyState === WebSocket.OPEN) {
    sess.ws.send(payload);
  } else {
    console.log(`[POST /mcp] WebSocket not open, queueing payload for UI (toWS).`);
    sess.toWS.push(payload);
  }

  if (hasRequests && sess.ws && sess.ws.readyState === WebSocket.OPEN) {
      // WS available → keep POST open as SSE for direct response streaming
      console.log(`[POST /mcp] WS open. Setting up SSE response stream for IDs: ${requestIds.join(', ')}`);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.write(":\n\n");

      for (const id of requestIds) {
          if (id !== undefined) sess.postResponses.set(id, res);
      }

      res.on('close', () => {
          console.log(`[POST /mcp] POST SSE closed for IDs: ${requestIds.join(', ')}`);
          const currentSess = sessions.get(configKey);
          if (currentSess) {
              requestIds.forEach(id => {
                  if (id !== undefined && currentSess.postResponses.get(id) === res) {
                      currentSess.postResponses.delete(id);
                  }
              });
          }
      });
  } else {
      // No WS yet → queue requests; responses will go out via GET stream later
      console.log(`[POST /mcp] WS not open or no requests. Immediate 202 Accepted.`);
      res.status(202).send();
  }
};
app.post("/mcp", mcpPostHandler);
app.post("/:config/mcp", mcpPostHandler);

/* ----------  WebSocket bridge (Handles messages FROM browser UI) --- */

const wss = new WebSocketServer({ noServer: true });

http.on("upgrade", (req, sock, head) => {
  const url = new URL(req.url ?? "", `http://${req.headers.host}`);
  if (url.pathname !== "/ws") {
      console.log("[Upgrade] Ignoring non-/ws upgrade request.");
      return sock.destroy();
  }
  console.log("[Upgrade] Handling upgrade request for /ws");
  wss.handleUpgrade(req, sock, head, ws => wss.emit("connection", ws, req));
});

wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
  // Determine config key from query string (?config=foo) – default "global"
  const parsedUrl = parse(req.url ?? "", true);
  const configQuery = parsedUrl.query.config;
  const configKey = Array.isArray(configQuery) ? configQuery[0] : (configQuery as string) || "global";

  const sess = ensureSession(configKey);
 
  console.log(`[WS Connect] Connection attempt for config '${configKey}'`);

  if (!sess) {
    console.log(`[WS Connect] Session not found for token. Closing WS.`);
    return ws.close(4001, "session unavailable");
  }
  
  console.log(`[WS Connect] WebSocket connected – replacing any existing WS for config '${configKey}'`);
  // If an old WebSocket exists, close it (last window wins)
  if (sess.ws && sess.ws.readyState === WebSocket.OPEN) {
      try { sess.ws.close(4000, "replaced by new window"); } catch {}
  }
  sess.ws = ws;
  console.log(`[WS Connect] Flushing ${sess.toWS.length} queued messages (from POST /mcp).`);
  sess.toWS.splice(0).forEach(m => ws.send(m));

  ws.on("message", (data) => {
      const messageString = String(data);
      console.log(`[WS Message] Received message from WS (Browser UI)`, messageString.substring(0, 200) + (messageString.length > 200 ? '...' : ''));
      
      let rpcMessage: JsonRpcMessage | null = null;
      try {
          rpcMessage = JSON.parse(messageString);
      } catch (e) {
          console.warn("[WS Message] Received non-JSON message from WS, cannot route precisely.", e);
          if (sess.sse && !sess.sse.closed) {
              console.log(`[WS Message] Forwarding non-JSON message to GET /mcp stream.`);
              sess.sse.write(`data: ${messageString}\n\n`);
          } else {
              console.log(`[WS Message] GET /mcp stream closed, queueing non-JSON message for Client (toSSE).`);
              sess.toSSE.push(messageString);
          }
          return;
      }

      if (rpcMessage && rpcMessage.id !== undefined && rpcMessage.method === undefined) {
          const responseId = rpcMessage.id;
          const postResponseStream = sess.postResponses.get(responseId);
          
          if (postResponseStream && !postResponseStream.closed) {
              console.log(`[WS Message] Routing response ID ${responseId} to its specific POST /mcp stream.`);
              postResponseStream.write(`data: ${messageString}\n\n`);
              sess.postResponses.delete(responseId);
              console.log(`[WS Message] Removed ID ${responseId} from postResponses map.`);
          } else {
              console.log(`[WS Message] Response ID ${responseId} has no matching active POST stream or stream is closed. Routing to GET /mcp stream (if available).`);
              if (sess.sse && !sess.sse.closed) {
                  sess.sse.write(`data: ${messageString}\n\n`);
              } else {
                  console.log(`[WS Message] GET /mcp stream closed, queueing unmatched response for Client (toSSE).`);
                  sess.toSSE.push(messageString);
              }
          }
      } 
      else if (rpcMessage && rpcMessage.method !== undefined) {
          console.log(`[WS Message] Routing notification/request ('${rpcMessage.method}') to GET /mcp stream (if available).`);
           if (sess.sse && !sess.sse.closed) {
              sess.sse.write(`data: ${messageString}\n\n`);
          } else {
              console.log(`[WS Message] GET /mcp stream closed, queueing notification/request for Client (toSSE).`);
              sess.toSSE.push(messageString);
          }
      } else {
          console.warn("[WS Message] Received message from WS is not a valid JSON-RPC response or notification/request:", rpcMessage);
      }
  });
  
  ws.on("close", () => {
      console.log(`[WS Close] WebSocket closed for token ${configKey.substring(0, 6)}...`);
       const currentSess = sessions.get(configKey);
       if (currentSess && currentSess.ws === ws) {
          currentSess.ws = undefined;
       }
  });
  ws.on("error", (error) => {
      console.error(`[WS Error] WebSocket error for token ${configKey.substring(0, 6)}...:`, error);
       const currentSess = sessions.get(configKey);
       if (currentSess && currentSess.ws === ws) {
           currentSess.ws = undefined;
       }
  });
});

/* ------------------------------------------------------------------ */
/*  3 – start Bun‑powered server                                      */
/* ------------------------------------------------------------------ */
const PORT = Number(process.env.PORT ?? 8787);
http.listen(PORT, () =>
  console.log(`➡  MCP proxy running on  http://localhost:${PORT}`));

