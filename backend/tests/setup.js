// tests/setup.js
// Set test database URL before tests run

const dotenv = require('dotenv');
const path = require('path');

// Load .env.test if it exists
dotenv.config({ path: path.join(__dirname, '..', '.env.test') });

// Fallback to default test database URL
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/issue_tracker_test';
}

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

console.log('Test environment configured:');
console.log('DATABASE_URL:', process.env.DATABASE_URL.replace(/:[^:]*@/, ':****@')); // Hide password
console.log('NODE_ENV:', process.env.NODE_ENV);
