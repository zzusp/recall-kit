import express from 'express';
import { createServer } from 'http';
import { initMCP } from './mcp/index.js';
import { logger } from './services/loggerService.js';

async function main() {
  // 记录服务启动日志
  const PORT = process.env.PORT || 3001;
  const HOST = process.env.HOST || '0.0.0.0';
  
  logger.logServiceStart(Number(PORT), HOST);

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

  // Start server
  httpServer.listen(Number(PORT), HOST, () => {
    logger.logServiceReady(Number(PORT), HOST);
    logger.info('MCP Server configuration', {
      endpoint: '/mcp',
      protocolVersion: '2025-06-18',
      allowedOrigins: process.env.ALLOWED_ORIGINS || '*',
      logLevel: process.env.LOG_LEVEL || 'info'
    });
  });

  // Handle server shutdown gracefully
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down server...');
    // 清理资源
    logger.info('Server shutdown complete');
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
  });
}

main().catch((err) => {
  logger.error('Failed to start MCP Server', {
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name
    }
  });
  process.exit(1);
});