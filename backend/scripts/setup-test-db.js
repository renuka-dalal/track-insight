#!/usr/bin/env node

const { Client } = require('pg');
const { execSync } = require('child_process');

const TEST_DB_NAME = 'issue_tracker_test';
const POSTGRES_URL = 'postgresql://postgres:postgres@localhost:5432/postgres';

async function setupTestDatabase() {
  console.log('Setting up test database...');

  const client = new Client({ connectionString: POSTGRES_URL });

  try {
    await client.connect();
    console.log('✓ Connected to PostgreSQL');

    // Drop existing test database
    try {
      await client.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
      console.log(`✓ Dropped existing ${TEST_DB_NAME} database`);
    } catch (error) {
      // Ignore if database doesn't exist
    }

    // Create test database
    await client.query(`CREATE DATABASE ${TEST_DB_NAME}`);
    console.log(`✓ Created ${TEST_DB_NAME} database`);

    await client.end();

    // Run migrations on test database
    console.log('Running migrations...');
    process.env.DATABASE_URL = `postgresql://postgres:postgres@localhost:5432/${TEST_DB_NAME}`;
    
    execSync('node scripts/migrate.js up', { 
      stdio: 'inherit',
      env: { ...process.env }
    });

    console.log('Test database ready!');
    console.log(`   Connection: postgresql://postgres:****@localhost:5432/${TEST_DB_NAME}`);
    console.log('');
    console.log('Run tests with: npm test');

  } catch (error) {
    console.error('Setup failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('');
      console.log('Make sure PostgreSQL is running:');
      console.log('   docker-compose up postgres -d');
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  setupTestDatabase();
}

module.exports = setupTestDatabase;
