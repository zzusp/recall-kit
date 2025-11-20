import express, { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { isInitializeRequest, ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types.js';
import { InMemoryEventStore } from '@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { initQueryHandler } from './queryHandler';
import { initSubmitHandler } from './submitHandler';
import { loadMCPServerConfig, MCPServerConfig } from './config';
import { SystemConfigService } from '../services/systemConfigService';
import { EmbeddingService } from '../services/embeddingService';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol';
import { logger, LogContext } from '../services/loggerService.js';

// 扩展 SSEServerTransport 类型以包含自定义属性
interface ExtendedSSEServerTransport extends SSEServerTransport {
  requestInfo?: {
    apiKey?: string;
    headers: any;
    query: any;
    ip?: string;
    userAgent?: string;
    url: string;
    method: string;
  };
}

// Map to store transports by session ID for different transport types
const streamableTransports: Map<string, StreamableHTTPServerTransport> = new Map();
const sseTransports: Map<string, ExtendedSSEServerTransport> = new Map();
const apiKeys: Map<string, string> = new Map();

// Function to create a new MCP server instance
function createMCPServer(
  queryHandler: any,
  submitHandler: any,
  config: MCPServerConfig,
): McpServer {
  const server = new McpServer(
    {
      name: 'recall-kit-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register query_experiences tool using registerTool
  server.registerTool('query_experiences', {
    title: 'Query Experiences',
    description: 'Query experience records by keywords or IDs',
    inputSchema: {
      keywords: z.array(z.string()).optional().describe('Keywords to search for'),
      ids: z.array(z.string()).optional().describe('Array of experience IDs to query'),
      limit: z.number()
        .min(1)
        .max(config.queryMaxLimit)
        .optional()
        .default(config.queryDefaultLimit)
        .describe(`Maximum number of results (1-${config.queryMaxLimit})`),
      offset: z.number().min(0).optional().default(0).describe('Offset for pagination'),
      sort: z.enum(['relevance', 'query_count', 'created_at']).optional().default('relevance').describe('Sort order'),
    },
  }, async (args, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => {
    // 获取存储的请求信息
    const sessionId = extra?.sessionId;
    const requestInfo = sessionId ? sseTransports.get(sessionId)?.requestInfo : null;
    
    const context: LogContext = {
      toolName: 'query_experiences',
      sessionId: sessionId,
      // 添加请求参数信息
      apiKey: requestInfo?.apiKey,
      userAgent: requestInfo?.userAgent,
      query: requestInfo?.query,
      ip: requestInfo?.ip,
      headers: requestInfo?.headers
    };

    logger.logToolCallStart('query_experiences', args, context);
    
    try {
      const result = await queryHandler(args);
      logger.logToolCallSuccess('query_experiences', result, context);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result),
          },
        ],
      };
    } catch (error) {
      logger.logToolCallError('query_experiences', error as Error, context);
      
      // Return standardized error response for tool failures
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              experiences: [],
              total_count: 0,
              has_more: false,
              error: error instanceof Error ? error.message : 'Unknown error occurred while querying experiences',
              error_type: 'tool_execution_error'
            }),
          },
        ],
        isError: true,
      };
    }
  });

  // Register submit_experience tool using registerTool
  server.registerTool('submit_experience', {
    title: 'Submit Experience',
    description: 'Submit a new experience record',
    inputSchema: {
      title: z.string().describe('Title of experience'),
      problem_description: z.string().describe('Description of problem'),
      root_cause: z.string().describe('Root cause of problem'),
      solution: z.string().describe('Solution to problem'),
      context: z.string().describe('Additional context'),
      keywords: z.array(z.string())
        .min(3, { message: 'At least 3 keywords are required.' })
        .describe('Keywords describing experience (at least 3). If a programming language or tech stack can be identified, it must be included.'),
    },
  }, async (args, extra: RequestHandlerExtra<ServerRequest, ServerNotification>) => {
    // 获取存储的请求信息
    const sessionId = extra?.sessionId;
    let requestInfo = null;
    
    if (sessionId) {
      // 尝试获取SSE传输的请求信息
      const sseTransport = sseTransports.get(sessionId);
      if (sseTransport?.requestInfo) {
        requestInfo = sseTransport.requestInfo;
      } else {
        // 如果没有SSE传输信息，尝试获取streamable传输
        const apiKey = apiKeys.get(sessionId);
        if (apiKey) {
          // 为streamable传输创建默认请求信息
          requestInfo = {
            apiKey: apiKey, // HTTP POST请求通常不包含API key，需要单独处理
            headers: {}, // 无法获取具体的headers信息
            query: {},   // 无法获取具体的query参数
            ip: undefined, // 无法获取具体的IP地址
            userAgent: undefined, // 无法获取具体的User-Agent
            url: '/mcp',
            method: 'POST'
          };
        }
      }
    }
    
    const context: LogContext = {
      toolName: 'submit_experience',
      sessionId: sessionId,
      // 添加请求参数信息
      apiKey: requestInfo?.apiKey,
      userAgent: requestInfo?.userAgent,
      query: requestInfo?.query,
      ip: requestInfo?.ip,
      headers: requestInfo?.headers
    };

    logger.logToolCallStart('submit_experience', args, context);
    
    try {
      // 创建提交上下文，包含API密钥
      const submitContext = {
        sessionId: sessionId,
        ipAddress: requestInfo?.ip,
        userAgent: requestInfo?.userAgent,
        apiKey: requestInfo?.apiKey
      };
      
      const result = await submitHandler(args, submitContext);
      logger.logToolCallSuccess('submit_experience', result, context);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result),
          },
        ],
      };
    } catch (error) {
      logger.logToolCallError('submit_experience', error as Error, context);
      
      // Return standardized error response for tool failures
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              experience_id: '',
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error occurred while submitting experience',
              error_type: 'tool_execution_error'
            }),
          },
        ],
        isError: true,
      };
    }
  });

  // Register prompt to guide conversation summarization
  server.registerPrompt('summarize_experience', {
    title: 'Summarize Conversation into Recall Kit Experience',
    description: [
      'Guide model through extracting experience fields from active conversation,',
      `drafting Markdown, and explicitly saving it to specs/experiences.`,
    ].join(' '),
  }, async () => ({
    description: 'Workflow instructions for producing and storing a Recall Kit experience file from current conversation.',
    messages: [
      {
        role: 'assistant',
        content: {
          type: 'text',
          text: [
            'Role: You are Recall Kit documentation scribe responsible for turning current conversation into a polished experience log.',
            '',
            'Steps:',
            '1. Review the latest conversation and capture: title, problem description, root cause, solution, context, and at least three keywords (include the programming language or tech stack when possible).',
            '2. If there are multiple resolved problems in the history messages, determine if the solution methods for these problems are the same. If they are the same, merge the solution methods into a single solution; if they are different, split them into different documents for summary.',
            '3. Populate the Markdown template below. For every field, first wrap the draft value with <!-- example-start --> and <!-- example-end --> to make edits safer, then remove those markers before returning the final Markdown.',
            '4. Create one or more markdown files in specs/experiences/ to save the results from step 3.',
            '5. You only need to generate the documentation, instruct the user to save it under specs/experiences/, and advise them to review and adjust as needed.',
            '',
            'Markdown template (fill in placeholders and remove markers before returning the final Markdown):',
            '```markdown',
            '---',
            'title: "<!-- example-start -->Title<!-- example-end -->"',
            'generated_at: <!-- example-start -->YYYY-MM-DDTHH:MM:SSZ<!-- example-end -->',
            'keywords:',
            '  - <!-- example-start -->keyword-1<!-- example-end -->',
            '  - <!-- example-start -->keyword-2<!-- example-end -->',
            '  - <!-- example-start -->keyword-3<!-- example-end -->',
            '---',
            '',
            '## Problem Description',
            '<!-- example-start -->Problem description goes here<!-- example-end -->',
            '',
            '## Root Cause',
            '<!-- example-start -->Root cause goes here<!-- example-end -->',
            '',
            '## Solution',
            '<!-- example-start -->Solution goes here<!-- example-end -->',
            '',
            '## Context',
            '<!-- example-start -->Context information goes here<!-- example-end -->',
            '',
            '## Lessons Learned (Will not be submitted)',
            '<!-- example-start -->Lessons learned/reflections go here<!-- example-end -->',
            '',
            '## References (Will not be submitted)',
            '<!-- example-start -->Reference links or code go here<!-- example-end -->',
            '```',
          ].join('\n'),
        },
      },
    ],
  }));

  // Register prompt to submit experience from existing document
  server.registerPrompt('submit_doc_experience', {
    title: 'Submit Experience from Document',
    description: [
      'Submit an existing experience document to the Recall Kit platform.',
      'Validates document format and extracts parameters for submission.',
    ].join(' '),
  }, async () => ({
    description: 'Instructions for submitting an existing experience document to the Recall Kit platform without additional processing.',
    messages: [
      {
        role: 'assistant',
        content: {
          type: 'text',
          text: [
            'Role: You are the Recall Kit document processor responsible for submitting existing experience documents to the platform.',
            '',
            'Process:',
            '1. Check if the user provided a document path in their input',
            '2. If no document path, ask the user to specify the path to the experience document',
            '3. Read the specified document and validate it follows the required template structure:',
            '   - YAML frontmatter with title, generated_at, and keywords (at least 3)',
            '   - Required sections: ## Problem Description, ## Root Cause, ## Solution, ## Context',
            '4. If validation fails, provide specific feedback about what needs to be fixed',
            '5. If validation passes, extract parameters from the document:',
            '   - title (from YAML frontmatter)',
            '   - problem_description (from "## Problem Description" section)',
            '   - root_cause (from "## Root Cause" section)',
            '   - solution (from "## Solution" section)',
            '   - context (from "## Context" section)',
            '   - keywords (from YAML frontmatter)',
            '6. Call the submit_experience tool with the extracted parameters without any additional processing',
            '7. Display the submission result to the user',
            '',
            'Important: Do not summarize or modify the content from the document. Extract the exact text and submit it as-is.',
            '',
            'Document Template Structure Required:',
            '```yaml',
            '---',
            'title: "Descriptive title"',
            'generated_at: YYYY-MM-DDTHH:MM:SSZ',
            'keywords:',
            '  - keyword1',
            '  - keyword2',
            '  - keyword3',
            '---',
            '',
            '## Problem Description',
            '[content]',
            '',
            '## Root Cause',
            '[content]',
            '',
            '## Solution',
            '[content]',
            '',
            '## Context',
            '[content]',
            '```',
          ].join('\n'),
        },
      },
    ],
  }));

  return server;
}

export async function initMCP(app: express.Application) {
  // Add a global middleware to log all requests with response time
  app.use((req, res, next) => {
    const startTime = Date.now();
    const context: LogContext = {
      method: req.method,
      url: req.url,
      requestId: req.headers['x-request-id'] as string || randomUUID().substring(0, 8)
    };

    // 记录请求开始
    logger.logApiRequest(req.method!, req.url!, req.headers, context);

    // 监听响应完成
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      logger.logApiResponse(req.method!, req.url!, res.statusCode, responseTime, context);
    });

    next();
  });

  // Initialize services
  const systemConfigService = new SystemConfigService();
  const embeddingService = new EmbeddingService(systemConfigService);
  
  // Load server config (without apiKey for now, will be set per request in SSE)
  let serverConfig = loadMCPServerConfig();
  
  // Initialize handlers with services (pool is no longer needed with postgres library)
  const queryHandler = await initQueryHandler({
    defaultLimit: serverConfig.queryDefaultLimit,
    maxLimit: serverConfig.queryMaxLimit,
    embeddingService
  });
  const submitHandler = await initSubmitHandler({
    embeddingService
  });

  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || undefined;

  console.log('[INIT] About to setup Express routes...');

  // Setup Express routes
  app.post('/mcp', async (req: Request, res: Response) => {
    try {
      const requestPayload = req.body as Record<string, any>;
      const requestId = (requestPayload && typeof requestPayload.id !== 'undefined')
        ? (requestPayload.id as string | number | null)
        : null;
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      let transport: StreamableHTTPServerTransport | undefined;
      
      if (sessionId && streamableTransports.has(sessionId)) {
        // Reuse existing transport for this session
        transport = streamableTransports.get(sessionId);
      } else if (!sessionId && isInitializeRequest(requestPayload)) {
        const apiKey = req.query?.api_key as string | undefined;
        // New initialization request - create new transport and server
        // Use InMemoryEventStore for resumability support (allows clients to reconnect and resume)
        const eventStore = new InMemoryEventStore();
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          allowedOrigins,
          enableDnsRebindingProtection: !!allowedOrigins,
          enableJsonResponse: true,
          eventStore, // Enable resumability
          onsessioninitialized: (sid) => {
            // Store transport by session ID when session is initialized
            // This avoids race conditions where requests might come in before the session is stored
            const context: LogContext = { sessionId: sid, transportType: 'streamable' };
            logger.logSessionInitialized(sid, 'streamable', context);
            if (transport) {
              streamableTransports.set(sid, transport);
              if (apiKey) {
                apiKeys.set(sid, apiKey);
              }
            }
          },
          onsessionclosed: (sid) => {
            const context: LogContext = { sessionId: sid, transportType: 'streamable' };
            logger.logConnectionClose(context);
            streamableTransports.delete(sid);
            apiKeys.delete(sid);
          },
        });

        // Set up onclose handler to clean up transport
        transport.onclose = () => {
          const sid = transport?.sessionId;
          if (sid && streamableTransports.has(sid)) {
            const context: LogContext = { sessionId: sid, transportType: 'streamable' };
            logger.logConnectionClose(context);
            streamableTransports.delete(sid);
            apiKeys.delete(sid);
          }
        };

        // Create a new server instance and connect it to the transport
        const server = createMCPServer(
          queryHandler, 
          submitHandler, 
          serverConfig
        );
        await server.connect(transport);
        
        try {
          await transport.handleRequest(req, res, requestPayload);
        } catch (error) {
          console.error('Error in transport.handleRequest during initialization:', error);
          if (!res.headersSent) {
            // Return proper MCP protocol error response
            res.status(200).json({
              jsonrpc: '2.0',
              error: {
                code: -32603,
                message: 'Internal server error during request processing',
                data: error instanceof Error ? error.message : 'Unknown error'
              },
              id: requestId,
            });
          } else if (!res.writableEnded) {
            res.end();
          }
        }
        return; // Already handled
      } else {
        // Invalid request - no session ID or not initialization request
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided',
          },
          id: null,
        });
        return;
      }

      // Handle request with existing transport
      if (transport) {
        try {
          await transport.handleRequest(req, res, requestPayload);
        } catch (error) {
          console.error('Error in transport.handleRequest:', error);
          if (!res.headersSent) {
            // Return proper MCP protocol error response
            res.status(200).json({
              jsonrpc: '2.0',
              error: {
                code: -32603,
                message: 'Internal server error during request processing',
                data: error instanceof Error ? error.message : 'Unknown error'
              },
              id: requestId,
            });
          } else if (!res.writableEnded) {
            res.end();
          }
        }
      } else {
        // Return proper MCP protocol error response
        res.status(200).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: Transport not found',
          },
          id: requestId,
        });
      }
    } catch (error) {
      console.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        // Return proper MCP protocol error response
        res.status(200).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error during request processing',
            data: error instanceof Error ? error.message : 'Unknown error'
          },
          id: null,
        });
      }
    }
  });

  app.get('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !streamableTransports.has(sessionId)) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    // Check for Last-Event-ID header for resumability
    const lastEventId = req.headers['last-event-id'] as string | undefined;
    if (lastEventId) {
      console.log(`Client reconnecting with Last-Event-ID: ${lastEventId}`);
    } else {
      console.log(`Establishing new SSE stream for session ${sessionId}`);
    }
    const transport = streamableTransports.get(sessionId);
    if (transport) {
      await transport.handleRequest(req, res);
    }
  });

  app.delete('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !streamableTransports.has(sessionId)) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    console.log(`Received session termination request for session ${sessionId}`);
    try {
      const transport = streamableTransports.get(sessionId);
      if (transport) {
        await transport.handleRequest(req, res);
      }
    } catch (error) {
      console.error('Error handling session termination:', error);
      if (!res.headersSent) {
        res.status(500).send('Error processing session termination');
      }
    }
  });

  // Legacy SSE endpoint for older clients
  app.get('/sse', async (req: Request, res: Response) => {
    const startTime = Date.now();
    let context: LogContext;
    
    try {
      // Extract api_key from query parameters
      const apiKey = req.query.api_key as string | undefined;
      
      // 存储完整的请求信息，供工具调用时使用
      const requestInfo = {
        apiKey: req.query.api_key,
        headers: req.headers,
        query: req.query,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        url: req.url,
        method: req.method
      };
      
      context = {
        url: req.url,
        method: req.method,
        transportType: 'sse',
        apiKeyId: apiKey ? apiKey.substring(0, 8) + '...' : undefined
      };
      
      logger.info('SSE connection requested', {
        ...context,
        hasApiKey: !!apiKey,
        userAgent: req.headers['user-agent'],
        ip: req.ip || req.socket.remoteAddress
      });
      
      // Create server config with api_key if provided
      const sseServerConfig = loadMCPServerConfig(apiKey);
      
      // Create SSE transport for legacy clients
      const transport = new SSEServerTransport('/messages', res);
      sseTransports.set(transport.sessionId, transport);

      // 将请求信息附加到 transport 上，供后续工具调用使用
      (transport as any).requestInfo = requestInfo;

      // 更新上下文包含会话ID
      context.sessionId = transport.sessionId;
      
      logger.logSessionInitialized(transport.sessionId, 'sse', context);

      // Set up cleanup when connection closes
      res.on('close', () => {
        sseTransports.delete(transport.sessionId);
        logger.logConnectionClose({ ...context, sessionId: transport.sessionId });
      });

      // Create and connect server instance with config containing api_key
      const server = createMCPServer(queryHandler, submitHandler, sseServerConfig);
      await server.connect(transport);

      const connectionTime = Date.now() - startTime;
      logger.logConnectionSuccess({ 
        ...context, 
        connectionTime,
        hasApiKey: !!apiKey 
      });
      
    } catch (error) {
      const connectionTime = Date.now() - startTime;
      const errorContext: LogContext = {
        url: req.url,
        method: req.method,
        transportType: 'sse'
      };
      
      logger.error('Error setting up SSE transport', {
        ...errorContext,
        connectionTime,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('X-Error-Type', 'server_error');
        res.status(500).json({
          error: {
            code: 'SERVER_ERROR',
            message: 'Error establishing SSE connection',
            type: 'server_error',
            details: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    }
  });

  // Legacy message endpoint for older clients
  app.post('/messages', async (req: Request, res: Response) => {
    try {
      const sessionId = req.query.sessionId as string;
      if (!sessionId || !sseTransports.has(sessionId)) {
        return res.status(400).send('No transport found for sessionId');
      }

      const transport = sseTransports.get(sessionId);
      
      if (transport) {
        await transport.handlePostMessage(req, res, req.body);
      } else {
        res.status(400).send('Transport not found');
      }
    } catch (error) {
      console.error('Error handling SSE message:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: req.body.id || null,
        });
      }
    }
  });

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  return { streamableTransports, sseTransports };
}