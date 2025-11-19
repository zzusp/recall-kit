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
import { console } from 'inspector';

// Map to store transports by session ID for different transport types
const streamableTransports: Map<string, StreamableHTTPServerTransport> = new Map();
const sseTransports: Map<string, SSEServerTransport> = new Map();

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
  }, async (args) => {
    try {
      const result = await queryHandler(args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result),
          },
        ],
      };
    } catch (error) {
      console.error('query_experiences tool error:', error);
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
    try {
      console.log('submit_experience tool called with extra:', extra);
      console.log('[Tool Debug] extra._meta:', (extra as any)._meta);
      console.log('[Tool Debug] extra._transport:', (extra as any)._transport);
      console.log('[Tool Debug] extra keys:', Object.keys(extra));
      
      // Try to access transport information if available
      if ((extra as any)._transport) {
        console.log('[Tool Debug] transport type:', typeof (extra as any)._transport);
        console.log('[Tool Debug] transport constructor:', (extra as any)._transport.constructor.name);
      }

      const result = await submitHandler(args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result),
          },
        ],
      };
    } catch (error) {
      console.error('submit_experience tool error:', error);
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
  // Add a global middleware to log all requests
  app.use((req, res, next) => {
    console.log(`[GLOBAL] ${req.method} ${req.url} - Query: ${JSON.stringify(req.query)}`);
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
            console.log(`Session initialized with ID: ${sid}`);
            if (transport) {
              streamableTransports.set(sid, transport);
            }
          },
          onsessionclosed: (sid) => {
            console.log(`Session closed: ${sid}`);
            streamableTransports.delete(sid);
          },
        });

        // Set up onclose handler to clean up transport
        transport.onclose = () => {
          const sid = transport?.sessionId;
          if (sid && streamableTransports.has(sid)) {
            console.log(`Transport closed for session ${sid}, removing from transports map`);
            streamableTransports.delete(sid);
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
    try {
      // Add basic log to verify this endpoint is being called
      console.log('=== SSE ENDPOINT CALLED ===');
      
      // Extract api_key from query parameters
      const apiKey = req.query.api_key as string | undefined;
      
      // Add log to verify api_key extraction
      console.log(`[SSE Connection] API Key extracted: ${apiKey ? apiKey.substring(0, 8) + '...' : 'undefined'}`);
      console.log(`[SSE Connection] Full query params:`, req.query);
      
      // Create server config with api_key if provided
      const sseServerConfig = loadMCPServerConfig(apiKey);
      
      // Create SSE transport for legacy clients
      const transport = new SSEServerTransport('/messages', res);
      sseTransports.set(transport.sessionId, transport);

      console.log(`[SSE] Transport created with session ID: ${transport.sessionId}`);

      // Set up cleanup when connection closes
      res.on('close', () => {
        sseTransports.delete(transport.sessionId);
        console.log(`SSE transport closed for session ${transport.sessionId}`);
      });

      // Create and connect server instance with config containing api_key
      const server = createMCPServer(queryHandler, submitHandler, sseServerConfig);
      await server.connect(transport);

      console.log(`SSE session established: ${transport.sessionId}${apiKey ? ' with api_key' : ''}`);
    } catch (error) {
      console.error('Error setting up SSE transport:', error);
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