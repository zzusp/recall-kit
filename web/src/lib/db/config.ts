import postgres from 'postgres';

// Database connection string from environment variable
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}
const sql = postgres(connectionString);

export default sql;