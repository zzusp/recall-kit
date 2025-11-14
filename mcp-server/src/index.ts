import express from 'express';
import { createServer } from 'http';
import { config } from 'dotenv';
import { initMCP } from './mcp';
import { initSupabase } from './lib/supabase';

// Load environment variables
config();

async function main() {
  // Initialize Supabase client
  const supabase = initSupabase();

  // Create Express app
  const app = express();
  app.use(express.json());

  // CORS middleware for Origin validation
  // Note: StreamableHTTPServerTransport handles CORS internally
  app.use((req, res, next) => {
    // Allow CORS for MCP clients (transport also handles this)
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, MCP-Session-Id, MCP-Protocol-Version, Accept, Last-Event-ID');
      res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
    }
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    next();
  });

  // Initialize MCP server
  const mcpServer = await initMCP(app, supabase);

  // Create HTTP server
  const httpServer = createServer(app);
  const PORT = process.env.PORT || 3001;
  const HOST = process.env.HOST || '0.0.0.0'; // For remote deployment

  // Start server
  httpServer.listen(Number(PORT), HOST, () => {
    console.log(`MCP Server running on ${HOST}:${PORT}`);
    console.log(`MCP Protocol endpoint: /mcp`);
    console.log(`Protocol version: 2025-06-18`);
    console.log(`Allowed origins: ${process.env.ALLOWED_ORIGINS || '*'}`);
  });

  // Handle server shutdown gracefully
  process.on('SIGINT', async () => {
    console.log('Shutting down server...');
    // Close all active transports to properly clean up resources
    if (mcpServer && mcpServer.transports) {
      for (const [sessionId, transport] of mcpServer.transports.entries()) {
        try {
          console.log(`Closing transport for session ${sessionId}`);
          await transport.close();
        } catch (error) {
          console.error(`Error closing transport for session ${sessionId}:`, error);
        }
      }
    }
    console.log('Server shutdown complete');
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    if (mcpServer && mcpServer.transports) {
      for (const [sessionId, transport] of mcpServer.transports.entries()) {
        try {
          await transport.close();
        } catch (error) {
          console.error(`Error closing transport for session ${sessionId}:`, error);
        }
      }
    }
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Failed to start MCP Server:', err);
  process.exit(1);
});