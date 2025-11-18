import postgres from 'postgres';

// Database connection string from environment variable
const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString);

export default sql;