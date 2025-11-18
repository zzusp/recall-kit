import { Pool } from 'pg';

// PostgreSQL connection configuration
export const dbConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'recall_kit',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || '',
  ssl: process.env.DATABASE_HOST?.includes('supabase.co') ? { rejectUnauthorized: false } : false
};

// Create connection pool
export const pool = new Pool(dbConfig);

// Database client class
export class DatabaseClient {
  private pool: Pool;

  constructor() {
    this.pool = pool;
  }

  async query(text: string, params?: any[]) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: result.rowCount });        
      return result;
    } catch (error) {
      console.error('Database query error', { text, error });
      throw error;
    }
  }

  async close() {
    await this.pool.end();
  }
}

// Export singleton instance
export const db = new DatabaseClient();
export default db;