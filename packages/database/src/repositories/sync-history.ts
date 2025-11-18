/**
 * Sync history repository - CRUD operations for sync tracking
 */

import { getDatabase, generateId } from '../client';
import type { SyncHistory, BookmarkSource } from '@bookmark-gen/shared';

export class SyncHistoryRepository {
  /**
   * Insert a new sync history record
   */
  insert(
    syncHistory: Omit<SyncHistory, 'id' | 'timestamp'>
  ): SyncHistory {
    const db = getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO sync_history (
        id, source, timestamp, total_fetched, new_inserts,
        duplicates_skipped, errors, error_details, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      syncHistory.source,
      now,
      syncHistory.total_fetched,
      syncHistory.new_inserts,
      syncHistory.duplicates_skipped,
      syncHistory.errors,
      syncHistory.error_details ? JSON.stringify(syncHistory.error_details) : null,
      syncHistory.status
    );

    return this.findById(id)!;
  }

  /**
   * Find sync history by ID
   */
  findById(id: string): SyncHistory | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM sync_history WHERE id = ?');
    const row = stmt.get(id) as any;

    return row ? this.mapRowToSyncHistory(row) : null;
  }

  /**
   * Get latest sync history for a source
   */
  getLatestBySource(source: BookmarkSource): SyncHistory | null {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM sync_history
      WHERE source = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `);
    const row = stmt.get(source) as any;

    return row ? this.mapRowToSyncHistory(row) : null;
  }

  /**
   * Get all sync history for a source
   */
  findBySource(source: BookmarkSource, limit = 10): SyncHistory[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM sync_history
      WHERE source = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    const rows = stmt.all(source, limit) as any[];

    return rows.map(this.mapRowToSyncHistory);
  }

  /**
   * Get all sync history
   */
  findAll(limit = 50): SyncHistory[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM sync_history
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as any[];

    return rows.map(this.mapRowToSyncHistory);
  }

  /**
   * Map database row to SyncHistory object
   */
  private mapRowToSyncHistory(row: any): SyncHistory {
    return {
      id: row.id,
      source: row.source,
      timestamp: new Date(row.timestamp),
      total_fetched: row.total_fetched,
      new_inserts: row.new_inserts,
      duplicates_skipped: row.duplicates_skipped,
      errors: row.errors,
      error_details: row.error_details ? JSON.parse(row.error_details) : null,
      status: row.status,
    };
  }
}
