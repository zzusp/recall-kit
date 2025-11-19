const { sql } = require('./dist/lib/db/config');

async function checkDbSchema() {
  try {
    console.log('Checking experience_records table schema...');
    const result = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'experience_records' ORDER BY ordinal_position`;
    
    console.log('Columns in experience_records table:');
    result.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });

    // Check if status column exists
    const statusColumn = result.find(row => row.column_name === 'status');
    if (!statusColumn) {
      console.log('\n❌ ERROR: status column is missing from experience_records table');
      console.log('This column is required for the vector search functionality.');
    } else {
      console.log('\n✓ status column exists');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error checking database schema:', error.message);
    process.exit(1);
  }
}

checkDbSchema();