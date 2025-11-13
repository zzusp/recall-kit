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

  // Initialize MCP server
  const mcpServer = await initMCP(app, supabase);

  // Create HTTP server
  const httpServer = createServer(app);
  const PORT = process.env.PORT || 3001;

  // Start server
  httpServer.listen(PORT, () => {
    console.log(`MCP Server running on port ${PORT}`);
    console.log(`MCP Protocol endpoint: /mcp`);
  });
}

main().catch((err) => {
  console.error('Failed to start MCP Server:', err);
  process.exit(1);
});