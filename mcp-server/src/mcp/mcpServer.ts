import express, { Request, Response } from 'express';
import { SupabaseClient } from '../lib/supabase';
import { initQueryHandler } from './queryHandler';
import { initSubmitHandler } from './submitHandler';
import { loadMCPServerConfig } from './config';
import { SessionManager } from './sessionManager';
import {
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCNotification,
  JSONRPCError,
  InitializeRequest,
  InitializeResponse,
  InitializeResult,
  InitializedNotification,
  MCP_PROTOCOL_VERSION
} from './types';

export class MCPServer {
  private queryHandler: any;
  private submitHandler: any;
  private sessionManager: SessionManager;
  private readonly allowedOrigins: Set<string>;

  constructor() {
    this.sessionManager = new SessionManager();
    // Allow all origins for now, but should be configured via env
    const origins = process.env.ALLOWED_ORIGINS?.split(',') || ['*'];
    this.allowedOrigins = new Set(origins);
  }

  async initialize(supabase: SupabaseClient) {
    const serverConfig = loadMCPServerConfig();
    this.queryHandler = await initQueryHandler(supabase, {
      defaultLimit: serverConfig.queryDefaultLimit,
      maxLimit: serverConfig.queryMaxLimit,
    });
    this.submitHandler = await initSubmitHandler(supabase);
  }

  private validateOrigin(origin: string | undefined): boolean {
    if (this.allowedOrigins.has('*')) {
      return true;
    }
    if (!origin) {
      return false;
    }
    return this.allowedOrigins.has(origin);
  }

  private validateProtocolVersion(version: string | undefined): boolean {
    if (!version) {
      return false;
    }
    // Support current version and allow negotiation
    return version === MCP_PROTOCOL_VERSION || version === '2025-03-26';
  }

  private handleInitialize(req: InitializeRequest, sessionId?: string): InitializeResponse {
    // Validate protocol version
    if (!this.validateProtocolVersion(req.params.protocolVersion)) {
      throw new Error(`Unsupported protocol version: ${req.params.protocolVersion}`);
    }

    // Create new session if not provided (initialize should always create new session)
    // But we'll store it in the response header, not return it in the response

    const result: InitializeResult = {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
        sampling: {}
      },
      serverInfo: {
        name: 'recall-kit-mcp-server',
        version: '1.0.0'
      }
    };

    return {
      jsonrpc: '2.0',
      id: req.id,
      result
    };
  }

  private async handleRequest(request: JSONRPCRequest, sessionId?: string): Promise<any> {
    if (!sessionId && request.method !== 'initialize') {
      throw new Error('Session required for non-initialize requests');
    }

    if (request.method === 'initialize') {
      return this.handleInitialize(request as InitializeRequest, sessionId);
    }

    // Validate session for other requests
    if (sessionId && !this.sessionManager.isValidSession(sessionId)) {
      throw new Error('Invalid or expired session');
    }

    let result;
    switch (request.method) {
      case 'query_experiences':
        result = await this.queryHandler(request.params);
        break;
      case 'submit_experience':
        result = await this.submitHandler(request.params);
        break;
      default:
        throw new Error(`Method not found: ${request.method}`);
    }

    return result;
  }

  private handleNotification(notification: JSONRPCNotification, sessionId?: string): void {
    if (notification.method === 'initialized') {
      // Handle initialized notification
      if (sessionId) {
        this.sessionManager.getSession(sessionId);
      }
      return;
    }

    // Handle other notifications if needed
    console.log('Received notification:', notification.method);
  }

  private createErrorResponse(id: string | number | null, error: JSONRPCError): JSONRPCResponse {
    return {
      jsonrpc: '2.0',
      id,
      error
    };
  }

  async handleMessage(
    message: JSONRPCRequest | JSONRPCNotification,
    sessionId?: string
  ): Promise<JSONRPCResponse | null> {
    try {
      // Check if it's a request (has id) or notification (no id)
      if ('id' in message && message.id !== null && message.id !== undefined) {
        // It's a request
        const result = await this.handleRequest(message as JSONRPCRequest, sessionId);
        return {
          jsonrpc: '2.0',
          id: message.id,
          result
        };
      } else {
        // It's a notification
        this.handleNotification(message as JSONRPCNotification, sessionId);
        return null; // Notifications don't have responses
      }
    } catch (error) {
      const errorResponse: JSONRPCError = {
        code: error instanceof Error && error.message.includes('not found') ? -32601 : -32000,
        message: error instanceof Error ? error.message : 'Internal error',
        data: error instanceof Error ? error.stack : undefined
      };

      return this.createErrorResponse(
        'id' in message ? message.id : null,
        errorResponse
      );
    }
  }

  setupRoutes(app: express.Application) {
    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    // MCP endpoint - supports both POST and GET
    app.post('/mcp', async (req: Request, res: Response) => {
      await this.handlePostRequest(req, res);
    });

    app.get('/mcp', async (req: Request, res: Response) => {
      await this.handleGetRequest(req, res);
    });

    app.delete('/mcp', async (req: Request, res: Response) => {
      await this.handleDeleteRequest(req, res);
    });
  }

  private async handlePostRequest(req: Request, res: Response) {
    // Validate Origin header
    const origin = req.headers.origin;
    if (!this.validateOrigin(origin)) {
      return res.status(403).json({
        error: {
          code: -32000,
          message: 'Origin not allowed'
        }
      });
    }

    // Get session ID from header
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    // Get protocol version
    const protocolVersion = req.headers['mcp-protocol-version'] as string | undefined;

    // Validate protocol version (except for initialize)
    if (req.body.method !== 'initialize' && !this.validateProtocolVersion(protocolVersion)) {
      return res.status(400).json({
        error: {
          code: -32000,
          message: 'Invalid or missing MCP-Protocol-Version header'
        }
      });
    }

    // Check Accept header
    const accept = req.headers.accept || '';
    const supportsSSE = accept.includes('text/event-stream');
    const supportsJSON = accept.includes('application/json');

    if (!supportsJSON && !supportsSSE) {
      return res.status(400).json({
        error: {
          code: -32000,
          message: 'Accept header must include application/json or text/event-stream'
        }
      });
    }

    try {
      // Handle the message
      const response = await this.handleMessage(req.body, sessionId);

      // If it's a notification or response, return 202 Accepted
      if (!response) {
        return res.status(202).end();
      }

      // Extract session ID from initialize response
      let finalSessionId = sessionId;
      if (req.body.method === 'initialize' && response.result) {
        finalSessionId = this.sessionManager.createSession();
      }

      // According to Streamable HTTP transport spec:
      // - Server MAY return SSE stream for requests
      // - Server MUST return JSON for simple responses
      // For now, we'll return JSON by default, but support SSE if client requests it
      if (supportsSSE && 'id' in req.body && req.body.id !== null) {
        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Add session ID header if this was an initialize request
        if (req.body.method === 'initialize' && finalSessionId) {
          res.setHeader('Mcp-Session-Id', finalSessionId);
        }

        // Send response as SSE event
        const eventData = JSON.stringify(response);
        res.write(`data: ${eventData}\n\n`);

        // Close stream after response (as per spec: server SHOULD close after sending response)
        res.end();
      } else {
        // Return JSON response
        res.setHeader('Content-Type', 'application/json');

        // Add session ID header if this was an initialize request
        if (req.body.method === 'initialize' && finalSessionId) {
          res.setHeader('Mcp-Session-Id', finalSessionId);
        }

        res.json(response);
      }
    } catch (error) {
      console.error('Error handling POST request:', error);
      const errorResponse: JSONRPCResponse = {
        jsonrpc: '2.0',
        id: req.body.id || null,
        error: {
          code: -32000,
          message: error instanceof Error ? error.message : 'Internal error'
        }
      };

      res.status(500).json(errorResponse);
    }
  }

  private async handleGetRequest(req: Request, res: Response) {
    // Validate Origin header
    const origin = req.headers.origin;
    if (!this.validateOrigin(origin)) {
      return res.status(403).end();
    }

    // Check Accept header
    const accept = req.headers.accept || '';
    if (!accept.includes('text/event-stream')) {
      return res.status(405).json({
        error: {
          code: -32000,
          message: 'GET requests must accept text/event-stream'
        }
      });
    }

    // Get session ID
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !this.sessionManager.isValidSession(sessionId)) {
      return res.status(404).json({
        error: {
          code: -32000,
          message: 'Invalid or missing session'
        }
      });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // For now, we'll just keep the connection open
    // In a full implementation, this would be used for server-to-client messages
    req.on('close', () => {
      // Connection closed
    });

    // Send a keepalive
    const keepalive = setInterval(() => {
      try {
        res.write(': keepalive\n\n');
      } catch (error) {
        clearInterval(keepalive);
      }
    }, 30000);

    req.on('close', () => {
      clearInterval(keepalive);
    });
  }

  private async handleDeleteRequest(req: Request, res: Response) {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (sessionId) {
      this.sessionManager.deleteSession(sessionId);
    }
    res.status(200).end();
  }
}

