import sql from './config';
import { Database } from '@/types/database';

// Helper function to convert camelCase to snake_case
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Helper function to convert snake_case to camelCase
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Transform object keys from camelCase to snake_case
function transformToSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => transformToSnakeCase(item));
  }
  
  const transformed: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = toSnakeCase(key);
      transformed[newKey] = transformToSnakeCase(obj[key]);
    }
  }
  return transformed;
}

// Transform object keys from snake_case to camelCase
function transformToCamelCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => transformToCamelCase(item));
  }
  
  const transformed: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = toCamelCase(key);
      transformed[newKey] = transformToCamelCase(obj[key]);
    }
  }
  return transformed;
}

// Database client class
export class DatabaseClient {
  // Execute a query with parameters
  async query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number | null }> {
    const start = Date.now();
    try {
      const result = await sql.unsafe(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: result.length });
      return { rows: result, rowCount: result.length };
    } catch (error) {
      console.error('Database query error', { text, error });
      throw error;
    }
  }

  // Get a single record by ID
  async getById<T>(table: string, id: string): Promise<T | null> {
    const query = `SELECT * FROM ${table} WHERE id = $1`;
    const result = await this.query(query, [id]);
    return result.rows.length > 0 ? transformToCamelCase(result.rows[0]) : null;
  }

  // Get multiple records with conditions
  async getMany<T>(
    table: string,
    conditions: Record<string, any> = {},
    options: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      orderDirection?: 'ASC' | 'DESC';
    } = {}
  ): Promise<T[]> {
    let query = `SELECT * FROM ${table}`;
    const params: any[] = [];
    const whereClauses: string[] = [];

    // Build WHERE clause
    Object.entries(conditions).forEach(([key, value], index) => {
      if (value !== undefined && value !== null) {
        whereClauses.push(`${toSnakeCase(key)} = $${params.length + 1}`);
        params.push(value);
      }
    });

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    // Add ORDER BY
    if (options.orderBy) {
      query += ` ORDER BY ${toSnakeCase(options.orderBy)} ${options.orderDirection || 'ASC'}`;
    }

    // Add LIMIT and OFFSET
    if (options.limit) {
      query += ` LIMIT $${params.length + 1}`;
      params.push(options.limit);
    }

    if (options.offset) {
      query += ` OFFSET $${params.length + 1}`;
      params.push(options.offset);
    }

    const result = await this.query(query, params);
    return result.rows.map(row => transformToCamelCase(row));
  }

  // Insert a record
  async insert<T>(table: string, data: Partial<T>): Promise<T> {
    const snakeData = transformToSnakeCase(data);
    const columns = Object.keys(snakeData).join(', ');
    const values = Object.values(snakeData);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

    const query = `INSERT INTO ${table} (${columns}) VALUES (${placeholders}) RETURNING *`;
    const result = await this.query(query, values);
    return transformToCamelCase(result.rows[0]);
  }

  // Update a record by ID
  async update<T>(table: string, id: string, data: Partial<T>): Promise<T> {
    const snakeData = transformToSnakeCase(data);
    const entries = Object.entries(snakeData);
    const setClause = entries.map(([key], index) => `${key} = $${index + 2}`).join(', ');
    const values = entries.map(([, value]) => value);

    const query = `UPDATE ${table} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`;
    const result = await this.query(query, [id, ...values]);
    return transformToCamelCase(result.rows[0]);
  }

  // Delete a record by ID
  async delete(table: string, id: string): Promise<boolean> {
    const query = `DELETE FROM ${table} WHERE id = $1`;
    const result = await this.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  // Count records with conditions
  async count(table: string, conditions: Record<string, any> = {}): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM ${table}`;
    const params: any[] = [];
    const whereClauses: string[] = [];

    Object.entries(conditions).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        whereClauses.push(`${toSnakeCase(key)} = $${params.length + 1}`);
        params.push(value);
      }
    });

    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    const result = await this.query(query, params);
    return parseInt(result.rows[0].count);
  }

  // Execute raw SQL
  async raw<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const result = await this.query<T>(sql, params);
    return result.rows;
  }
}

// Create singleton instance
export const db = new DatabaseClient();
export default db;