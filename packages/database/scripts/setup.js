/**
 * Database setup script
 * Creates the database and initializes schema
 */

const { mkdirSync, existsSync } = require('fs');
const { join } = require('path');

// Ensure data directory exists
const dataDir = join(__dirname, '../../../data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
  console.log('✅ Created data directory');
}

// Set DATABASE_PATH environment variable
process.env.DATABASE_PATH = join(dataDir, 'bookmarks.db');

// Import and run initialization
const { initializeSchema } = require('../src/client');

try {
  initializeSchema();
  console.log('✅ Database setup completed successfully');
  process.exit(0);
} catch (error) {
  console.error('❌ Database setup failed:', error);
  process.exit(1);
}
