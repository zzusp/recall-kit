/**
 * Database Configuration for MCP Server
 * Uses postgres library with DATABASE_URL, consistent with web module
 */

import postgres from 'postgres';
import { config } from 'dotenv';
import { join, dirname } from 'path';

// Load environment variables if not already loaded
if (!process.env.DATABASE_URL) {
  const __dirname = dirname(__filename);
  const envPath = join(__dirname, '../../../.env');
  console.log('Loading .env from db config:', envPath);
  config({ path: envPath });
}

// Database connection string from environment variable
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create sql instance
const sql = postgres(connectionString);

// Export sql instance
export { sql };

// Export query function that mimics pool.query for compatibility
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const result = await sql.unsafe(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: result.length });
    
    // Transform result to match pg library format
    return {
      rows: result,
      rowCount: result.length
    };
  } catch (error) {
    const duration = Date.now() - start;
    console.error('Query error', { text, duration, error });
    throw error;
  }
}

// Health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const result = await sql`SELECT 1`;
    return result.length === 1;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}