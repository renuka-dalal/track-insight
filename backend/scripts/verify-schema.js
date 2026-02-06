#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function verifySchema() {
  try {
    console.log('Verifying database schema...');
    
    // Check if required tables exist
    const tables = ['users', 'issues', 'comments', 'labels', 'issue_labels'];
    
    for (const table of tables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [table]);
      
      if (!result.rows[0].exists) {
        throw new Error(`Table '${table}' does not exist`);
      }
      
      console.log(`Table '${table}' exists`);
    }
    
    // Verify critical columns
    const columnChecks = [
      { table: 'issues', column: 'status' },
      { table: 'issues', column: 'priority' },
      { table: 'users', column: 'username' },
      { table: 'comments', column: 'content' }
    ];
    
    for (const check of columnChecks) {
      const result = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
      `, [check.table, check.column]);
      
      if (result.rows.length === 0) {
        throw new Error(`Column '${check.column}' does not exist in table '${check.table}'`);
      }
      
      console.log(`Column '${check.table}.${check.column}' exists`);
    }
    
    // Check for indexes
    const indexResult = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename IN ('issues', 'users', 'comments')
    `);
    
    console.log(`Found ${indexResult.rows.length} indexes`);
    
    console.log('Schema verification passed');
    process.exit(0);
  } catch (error) {
    console.error(' Schema verification failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  verifySchema();
}

module.exports = verifySchema;
