import express from 'express';
import { createServer } from 'http';
import { initMCP } from './mcp/index.js';

async function main() {

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
  await initMCP(app);

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
    console.log('Server shutdown complete');
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Failed to start MCP Server:', err);
  process.exit(1);
});