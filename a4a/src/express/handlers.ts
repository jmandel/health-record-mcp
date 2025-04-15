import type * as express from 'express';
import type { A2AServerCore } from '../core/A2AServerCore';
import type { JsonRpcRequest, JsonRpcResponse, JsonRpcError, JsonRpcErrorResponse, JsonRpcSuccessResponse, TaskSubscribeParams, TaskResubscribeParams } from '../types';
import { A2AErrorCodes } from '../types';

export function createA2AExpressHandlers(core: A2AServerCore) {

  const agentCardHandler: express.RequestHandler = (req, res) => {
    res.json(core.getAgentCard());
  };

  const a2aRpcHandler: express.RequestHandler = async (req, res) => {
    if (req.headers['content-type'] !== 'application/json') {
      return res.status(415).json({
        jsonrpc: "2.0",
        id: null,
        error: { code: A2AErrorCodes.ParseError, message: "Unsupported Media Type: Content-Type must be application/json" }
      });
    }

    const body = req.body as JsonRpcRequest;
    let requestId: string | number | null = null; // Keep track of ID for response

    try {
        // Basic JSON-RPC validation
        if (body.jsonrpc !== "2.0" || typeof body.method !== 'string' || (!body.id && body.id !== null)) {
             throw createJsonRpcError(A2AErrorCodes.InvalidRequest, "Invalid JSON-RPC request structure.", null);
        }
        requestId = body.id;

       let authContext: any = null;
       if (typeof (core as any).getAuthContext === 'function') {
         authContext = await (core as any).getAuthContext(req);
         // TODO: Implement actual authorization based on AgentCard requirements and authContext
         // Example: if (core.getAgentCard().authentication.schemes.length > 0 && !authContext) {
         //   throw createJsonRpcError(A2AErrorCodes.AuthenticationRequired, "Authentication required.", requestId);
         // }
       }


        let result: any;
        let isSseRequest = false;

        // Handle SSE methods separately to manage the response stream
        if (body.method === 'tasks/sendSubscribe' || body.method === 'tasks/resubscribe') {
            isSseRequest = true;

            // Check capability before setting headers
            if (!core.getAgentCard().capabilities.streaming) {
                 throw createJsonRpcError(A2AErrorCodes.UnsupportedOperation, `Method ${body.method} requires streaming capability, which is not supported by this agent.`, requestId);
            }

            // Set SSE headers
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.flushHeaders(); // Send headers immediately

            // Call the appropriate core method, which will handle sending SSE events
            // These methods now return void and manage the SSE stream via the passed 'res' object
            if (body.method === 'tasks/sendSubscribe') {
                 await core.handleTaskSendSubscribe(requestId, body.params as TaskSubscribeParams, res, authContext);
            } else { // tasks/resubscribe
                 await core.handleTaskResubscribe(requestId, body.params as TaskResubscribeParams, res, authContext);
            }

            // For SSE requests, we don't send a final JSON response here.
            // The connection is kept open, and A2AServerCore sends events.
            // The core's _addSseSubscription handles cleanup on connection close.
            return; // End execution for this handler, keep connection open.
        }

        switch (body.method) {
            case 'tasks/send':
                result = await core.handleTaskSend(body.params, authContext);
                break;
            case 'tasks/get':
                 result = await core.handleTaskGet(body.params, authContext);
                 break;
            case 'tasks/cancel':
                result = await core.handleTaskCancel(body.params, authContext);
                break;
            case 'tasks/pushNotification/set':
                 result = await core.handleSetPushNotification(body.params, authContext);
                 break;
            case 'tasks/pushNotification/get':
                 result = await core.handleGetPushNotification(body.params, authContext);
                 break;
            // TODO: Add tasks/sendSubscribe, tasks/resubscribe when SSE is implemented
            default:
                 throw createJsonRpcError(A2AErrorCodes.MethodNotFound, `Method not found: ${body.method}`, requestId);
        }

        // Only send JSON response for non-SSE methods
        if (!isSseRequest) {
            const response: JsonRpcSuccessResponse = {
                jsonrpc: "2.0",
                id: requestId,
                result: result
            };
            res.json(response);
        }

    } catch (error: any) {
        console.error("[ExpressHandler] Error processing A2A request:", error);

        let jsonRpcError: JsonRpcError;

        if (error.isA2AError) {
             jsonRpcError = { code: error.code, message: error.message, data: error.data };
        } else if (error instanceof SyntaxError) {
            jsonRpcError = { code: A2AErrorCodes.ParseError, message: "Failed to parse JSON request." };
        }
        else {
            jsonRpcError = { code: A2AErrorCodes.InternalError, message: "An internal server error occurred.", data: error.message };
        }

        // Ensure we don't try to send a JSON error response over an established SSE stream
        if (!res.headersSent) {
             const errorResponse: JsonRpcErrorResponse = {
                 jsonrpc: "2.0",
                 id: requestId, // Use captured ID, or null if parsing failed early
                 error: jsonRpcError
             };
             // Determine appropriate HTTP status code based on error
             let statusCode = 500;
             if (jsonRpcError.code === A2AErrorCodes.ParseError || jsonRpcError.code === A2AErrorCodes.InvalidRequest) statusCode = 400;
             else if (jsonRpcError.code === A2AErrorCodes.MethodNotFound) statusCode = 404;
             else if (jsonRpcError.code === A2AErrorCodes.TaskNotFound) statusCode = 404; // Treat task not found as 404
             else if (jsonRpcError.code === A2AErrorCodes.AuthenticationRequired) statusCode = 401;
             else if (jsonRpcError.code === A2AErrorCodes.AuthorizationFailed) statusCode = 403;
             else if (jsonRpcError.code === A2AErrorCodes.UnsupportedOperation) statusCode = 405; // Method Not Allowed

             res.status(statusCode).json(errorResponse);
        } else {
            // If headers already sent (SSE established), we cannot send a JSON error.
            // Log the error. The connection might close or the core might send an SSE error event if possible.
            console.error("[ExpressHandler] Error occurred after SSE headers sent. Cannot send JSON error response. Task ID might be relevant:", body?.id);
            // Optionally, try to close the SSE connection gracefully if it's still open
            if (!res.closed) {
                res.end(); // Close the connection
            }
        }
    }
  };

  return { agentCardHandler, a2aRpcHandler };
}


// Helper to create structured JSON-RPC errors
function createJsonRpcError(code: number, message: string, id: string | number | null, data?: any): Error & { isA2AError: boolean, code: number, data?: any } {
     const error = new Error(message) as any;
     error.isA2AError = true; // Mark it for specific handling
     error.code = code;
     error.id = id; // Include ID for context if available
     error.data = data;
     return error;
}
