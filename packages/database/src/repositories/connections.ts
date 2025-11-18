/**
 * Bookmark connections repository - CRUD operations for bookmark relationships
 */

import { getDatabase, generateId } from '../client';
import type { BookmarkConnection } from '@bookmark-gen/shared';

export class ConnectionRepository {
  /**
   * Create a new connection
   */
  create(connection: Omit<BookmarkConnection, 'id' | 'created_at'>): BookmarkConnection {
    const db = getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO bookmark_connections (
        id, bookmark_id_1, bookmark_id_2, connection_type, strength_score, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(bookmark_id_1, bookmark_id_2, connection_type) DO UPDATE SET
        strength_score = excluded.strength_score,
        created_at = excluded.created_at
    `);

    stmt.run(
      id,
      connection.bookmark_id_1,
      connection.bookmark_id_2,
      connection.connection_type,
      connection.strength_score,
      now
    );

    return this.findById(id)!;
  }

  /**
   * Find connection by ID
   */
  findById(id: string): BookmarkConnection | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM bookmark_connections WHERE id = ?');
    const row = stmt.get(id) as any;

    return row ? this.mapRowToConnection(row) : null;
  }

  /**
   * Get all connections for a bookmark
   */
  findByBookmarkId(bookmarkId: string): BookmarkConnection[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM bookmark_connections
      WHERE bookmark_id_1 = ? OR bookmark_id_2 = ?
      ORDER BY strength_score DESC
    `);

    const rows = stmt.all(bookmarkId, bookmarkId) as any[];
    return rows.map(this.mapRowToConnection);
  }

  /**
   * Get connections by type
   */
  findByType(connectionType: string): BookmarkConnection[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM bookmark_connections
      WHERE connection_type = ?
      ORDER BY strength_score DESC
    `);

    const rows = stmt.all(connectionType) as any[];
    return rows.map(this.mapRowToConnection);
  }

  /**
   * Get all connections
   */
  findAll(limit?: number): BookmarkConnection[] {
    const db = getDatabase();
    let query = 'SELECT * FROM bookmark_connections ORDER BY strength_score DESC';

    if (limit) {
      query += ' LIMIT ?';
    }

    const stmt = db.prepare(query);
    const rows = limit ? stmt.all(limit) : stmt.all();

    return (rows as any[]).map(this.mapRowToConnection);
  }

  /**
   * Delete connection by ID
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM bookmark_connections WHERE id = ?');
    const result = stmt.run(id);

    return result.changes > 0;
  }

  /**
   * Delete all connections for a bookmark
   */
  deleteByBookmarkId(bookmarkId: string): number {
    const db = getDatabase();
    const stmt = db.prepare(`
      DELETE FROM bookmark_connections
      WHERE bookmark_id_1 = ? OR bookmark_id_2 = ?
    `);
    const result = stmt.run(bookmarkId, bookmarkId);

    return result.changes;
  }

  /**
   * Get connection count
   */
  count(): number {
    const db = getDatabase();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM bookmark_connections');
    const row = stmt.get() as { count: number };

    return row.count;
  }

  /**
   * Map database row to BookmarkConnection object
   */
  private mapRowToConnection(row: any): BookmarkConnection {
    return {
      id: row.id,
      bookmark_id_1: row.bookmark_id_1,
      bookmark_id_2: row.bookmark_id_2,
      connection_type: row.connection_type,
      strength_score: row.strength_score,
      created_at: new Date(row.created_at),
    };
  }
}
