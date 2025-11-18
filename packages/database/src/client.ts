/**
 * SQLite database client and connection management
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

let db: Database.Database | null = null;

export interface DatabaseConfig {
  path: string;
  readonly?: boolean;
}

/**
 * Initialize and get database connection
 */
export function getDatabase(config?: DatabaseConfig): Database.Database {
  if (db) {
    return db;
  }

  const dbPath = config?.path || process.env.DATABASE_PATH || './data/bookmarks.db';
  const readonly = config?.readonly || false;

  db = new Database(dbPath, {
    readonly,
    fileMustExist: false,
  });

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  return db;
}

/**
 * Initialize database schema
 */
export function initializeSchema(): void {
  const db = getDatabase();
  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');

  // Execute schema (split by semicolon for multiple statements)
  db.exec(schema);

  console.log('✅ Database schema initialized successfully');
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Check database health
 */
export function checkHealth(): { status: 'ok' | 'error'; message: string } {
  try {
    const db = getDatabase();
    const result = db.prepare('SELECT 1 as test').get() as { test: number };

    if (result.test === 1) {
      return { status: 'ok', message: 'Database connection healthy' };
    }

    return { status: 'error', message: 'Unexpected database response' };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
}

// Helper to generate unique IDs
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
