import express, { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { InMemoryEventStore } from '@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { SupabaseClient } from '../lib/supabase';
import { initQueryHandler } from './queryHandler';
import { initSubmitHandler } from './submitHandler';
import { loadMCPServerConfig, MCPServerConfig } from './config';

const DEFAULT_EXPERIENCE_OUTPUT_PATH = 'specs/experiences';

// Map to store transports by session ID
const transports: Map<string, StreamableHTTPServerTransport> = new Map();

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
    description: 'Query experience records by keywords',
    inputSchema: {
      keywords: z.array(z.string()).optional().describe('Keywords to search for'),
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
    const result = await queryHandler(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result),
        },
      ],
    };
  });

  // Register submit_experience tool using registerTool
  server.registerTool('submit_experience', {
    title: 'Submit Experience',
    description: 'Submit a new experience record',
    inputSchema: {
      title: z.string().describe('Title of the experience'),
      problem_description: z.string().describe('Description of the problem'),
      root_cause: z.string().describe('Root cause of the problem'),
      solution: z.string().describe('Solution to the problem'),
      context: z.string().describe('Additional context'),
      keywords: z.array(z.string())
        .min(3, { message: 'At least 3 keywords are required.' })
        .describe('Keywords describing the experience (at least 3). If a programming language or tech stack can be identified, it must be included.'),
    },
  }, async (args) => {
    const result = await submitHandler(args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result),
        },
      ],
    };
  });

  // Register prompt to guide conversation summarization
  server.registerPrompt('summarize_experience', {
    title: 'Summarize Conversation into Recall Kit Experience',
    description: [
      'Guide the model through extracting experience fields from the active conversation,',
      `drafting the Markdown, and explicitly saving it to ${DEFAULT_EXPERIENCE_OUTPUT_PATH}.`,
    ].join(' '),
  }, async () => ({
    description: 'Workflow instructions for producing and storing a Recall Kit experience file from the current conversation.',
    messages: [
      {
        role: 'assistant',
        content: {
          type: 'text',
          text: [
            'Role: You are the Recall Kit documentation scribe responsible for turning the current conversation into a polished experience log.',
            '',
            'Steps:',
            '1. Review the latest conversation and capture: title, problem description, root cause, solution, context, and at least three keywords (include the programming language or tech stack when possible).',
            '2. Populate the Markdown template below. For every field, first wrap the draft value with <!-- example-start --> and <!-- example-end --> to make edits safer, then remove those markers before returning the final Markdown.',
            `3. Create a new markdown file in ${DEFAULT_EXPERIENCE_OUTPUT_PATH}/ to save step 2 result.`,
            '',
            'Markdown template (fill in placeholders and remove the markers before returning the final Markdown):',
            '```markdown',
            '---',
            'title: "<!-- example-start -->标题<!-- example-end -->"',
            'generated_at: <!-- example-start -->YYYY-MM-DDTHH:MM:SSZ<!-- example-end -->',
            'keywords:',
            '  - <!-- example-start -->keyword-1<!-- example-end -->',
            '  - <!-- example-start -->keyword-2<!-- example-end -->',
            '  - <!-- example-start -->keyword-3<!-- example-end -->',
            '---',
            '',
            '## Problem Description',
            '<!-- example-start -->这里填写问题描述<!-- example-end -->',
            '',
            '## Root Cause',
            '<!-- example-start -->这里填写根本原因<!-- example-end -->',
            '',
            '## Solution',
            '<!-- example-start -->这里填写解决方案<!-- example-end -->',
            '',
            '## Context',
            '<!-- example-start -->这里填写上下文信息<!-- example-end -->',
            '',
            '## Lessons Learned',
            '<!-- example-start -->这里填写经验总结/反思<!-- example-end -->',
            '',
            '## References',
            '<!-- example-start -->这里填写参考链接或代码<!-- example-end -->',
            '```',
          ].join('\n'),
        },
      },
    ],
  }));

  return server;
}

export async function initMCP(app: express.Application, supabase: SupabaseClient) {
  const serverConfig = loadMCPServerConfig();
  // Initialize handlers
  const queryHandler = await initQueryHandler(supabase, {
    defaultLimit: serverConfig.queryDefaultLimit,
    maxLimit: serverConfig.queryMaxLimit,
  });
  const submitHandler = await initSubmitHandler(supabase);

  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || undefined;

  // Setup Express routes
  app.post('/mcp', async (req: Request, res: Response) => {
    try {
      const requestPayload = req.body as Record<string, any>;
      const requestId = (requestPayload && typeof requestPayload.id !== 'undefined')
        ? (requestPayload.id as string | number | null)
        : null;
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      let transport: StreamableHTTPServerTransport | undefined;

      if (sessionId && transports.has(sessionId)) {
        // Reuse existing transport for this session
        transport = transports.get(sessionId);
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
            // Store the transport by session ID when session is initialized
            // This avoids race conditions where requests might come in before the session is stored
            console.log(`Session initialized with ID: ${sid}`);
            if (transport) {
              transports.set(sid, transport);
            }
          },
          onsessionclosed: (sid) => {
            console.log(`Session closed: ${sid}`);
            transports.delete(sid);
          },
        });

        // Set up onclose handler to clean up transport
        transport.onclose = () => {
          const sid = transport?.sessionId;
          if (sid && transports.has(sid)) {
            console.log(`Transport closed for session ${sid}, removing from transports map`);
            transports.delete(sid);
          }
        };

        // Create a new server instance and connect it to the transport
        const server = createMCPServer(queryHandler, submitHandler, serverConfig);
        await server.connect(transport);
        try {
          await transport.handleRequest(req, res, requestPayload);
        } catch (error) {
          console.error('Error in transport.handleRequest during initialization:', error);
          if (!res.headersSent) {
            res.status(500).json({
              jsonrpc: '2.0',
              error: {
                code: -32603,
                message: 'Internal server error',
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

      // Handle the request with existing transport
      if (transport) {
        try {
          await transport.handleRequest(req, res, requestPayload);
        } catch (error) {
          console.error('Error in transport.handleRequest:', error);
          if (!res.headersSent) {
            res.status(500).json({
              jsonrpc: '2.0',
              error: {
                code: -32603,
                message: 'Internal server error',
              },
              id: requestId,
            });
          } else if (!res.writableEnded) {
            res.end();
          }
        }
      } else {
        res.status(400).json({
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
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  });

  app.get('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports.has(sessionId)) {
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
    const transport = transports.get(sessionId);
    if (transport) {
      await transport.handleRequest(req, res);
    }
  });

  app.delete('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    console.log(`Received session termination request for session ${sessionId}`);
    try {
      const transport = transports.get(sessionId);
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

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  return { transports };
}
