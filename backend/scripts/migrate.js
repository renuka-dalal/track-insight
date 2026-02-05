#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

async function createMigrationsTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  await pool.query(query);
  console.log('✅ Migrations table ready');
}

async function getAppliedMigrations() {
  const result = await pool.query(
    'SELECT migration_name FROM schema_migrations ORDER BY migration_name'
  );
  return result.rows.map(row => row.migration_name);
}

async function getMigrationFiles() {
  const files = fs.readdirSync(MIGRATIONS_DIR);
  return files
    .filter(f => f.endsWith('.sql') && !f.endsWith('_down.sql'))
    .sort();
}

async function applyMigration(filename) {
  const filepath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filepath, 'utf8');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log(`Applying migration: ${filename}`);
    await client.query(sql);
    
    await client.query(
      'INSERT INTO schema_migrations (migration_name) VALUES ($1)',
      [filename]
    );
    
    await client.query('COMMIT');
    console.log(`✅ Applied: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Failed to apply ${filename}:`, error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function rollbackMigration(filename) {
  const downFile = filename.replace('.sql', '_down.sql');
  const filepath = path.join(MIGRATIONS_DIR, downFile);
  
  if (!fs.existsSync(filepath)) {
    console.error(`❌ Rollback file not found: ${downFile}`);
    return;
  }
  
  const sql = fs.readFileSync(filepath, 'utf8');
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log(`Rolling back migration: ${filename}`);
    await client.query(sql);
    
    await client.query(
      'DELETE FROM schema_migrations WHERE migration_name = $1',
      [filename]
    );
    
    await client.query('COMMIT');
    console.log(`✅ Rolled back: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Failed to rollback ${filename}:`, error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function migrateUp() {
  try {
    await createMigrationsTable();
    
    const applied = await getAppliedMigrations();
    const available = await getMigrationFiles();
    
    const pending = available.filter(m => !applied.includes(m));
    
    if (pending.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }
    
    console.log(`Found ${pending.length} pending migrations`);
    
    for (const migration of pending) {
      await applyMigration(migration);
    }
    
    console.log('✅ All migrations applied successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function migrateDown() {
  try {
    await createMigrationsTable();
    
    const applied = await getAppliedMigrations();
    
    if (applied.length === 0) {
      console.log('✅ No migrations to rollback');
      return;
    }
    
    const lastMigration = applied[applied.length - 1];
    console.log(`Rolling back: ${lastMigration}`);
    
    await rollbackMigration(lastMigration);
    console.log('✅ Rollback completed');
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    process.exit(1);
  }
}

async function showStatus() {
  try {
    await createMigrationsTable();
    
    const applied = await getAppliedMigrations();
    const available = await getMigrationFiles();
    
    console.log('\n Migration Status:');
    console.log('─'.repeat(60));
    
    for (const migration of available) {
      const status = applied.includes(migration) ? '✅ Applied' : '⏳ Pending';
      console.log(`${status} - ${migration}`);
    }
    
    console.log('─'.repeat(60));
    console.log(`Total: ${available.length} | Applied: ${applied.length} | Pending: ${available.length - applied.length}`);
    console.log('');
  } catch (error) {
    console.error('Error checking status:', error);
    process.exit(1);
  }
}

async function main() {
  const command = process.argv[2];
  
  if (!command) {
    console.log('Usage: node migrate.js [up|down|status]');
    process.exit(1);
  }
  
  try {
    switch (command) {
      case 'up':
        await migrateUp();
        break;
      case 'down':
        await migrateDown();
        break;
      case 'status':
        await showStatus();
        break;
      default:
        console.log('Unknown command:', command);
        console.log('Available commands: up, down, status');
        process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { migrateUp, migrateDown };
