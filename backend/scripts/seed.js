#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function seed() {
  try {
    console.log('Seeding database...');
    
    const seedFile = path.join(__dirname, '../seeds/dev_data.sql');
    const sql = fs.readFileSync(seedFile, 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Database seeded successfully');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  seed();
}

module.exports = seed;
