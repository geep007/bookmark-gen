/**
 * Bookmark repository - CRUD operations for bookmarks
 */

import { getDatabase, generateId } from '../client';
import type { Bookmark, BookmarkSource } from '@bookmark-gen/shared';

export class BookmarkRepository {
  /**
   * Insert a new bookmark
   */
  insert(bookmark: Omit<Bookmark, 'id' | 'created_at' | 'updated_at'>): Bookmark {
    const db = getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO bookmarks (
        id, source, source_id, url, author, author_url, content,
        bookmarked_at, created_at, updated_at, enrichment_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      bookmark.source,
      bookmark.source_id,
      bookmark.url,
      bookmark.author,
      bookmark.author_url || null,
      bookmark.content,
      bookmark.bookmarked_at.toISOString(),
      now,
      now,
      bookmark.enrichment_version || null
    );

    return this.findById(id)!;
  }

  /**
   * Find bookmark by ID
   */
  findById(id: string): Bookmark | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM bookmarks WHERE id = ?');
    const row = stmt.get(id) as any;

    return row ? this.mapRowToBookmark(row) : null;
  }

  /**
   * Find bookmark by source and source_id
   */
  findBySourceId(source: BookmarkSource, sourceId: string): Bookmark | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM bookmarks WHERE source = ? AND source_id = ?');
    const row = stmt.get(source, sourceId) as any;

    return row ? this.mapRowToBookmark(row) : null;
  }

  /**
   * Get all bookmarks
   */
  findAll(options?: { limit?: number; offset?: number; source?: BookmarkSource }): Bookmark[] {
    const db = getDatabase();
    let query = 'SELECT * FROM bookmarks';
    const params: any[] = [];

    if (options?.source) {
      query += ' WHERE source = ?';
      params.push(options.source);
    }

    query += ' ORDER BY bookmarked_at DESC';

    if (options?.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    if (options?.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }

    const stmt = db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map(this.mapRowToBookmark);
  }

  /**
   * Get bookmarks needing enrichment
   */
  findUnenriched(limit?: number): Bookmark[] {
    const db = getDatabase();
    let query = 'SELECT * FROM bookmarks WHERE enrichment_version IS NULL ORDER BY created_at ASC';

    if (limit) {
      query += ' LIMIT ?';
    }

    const stmt = db.prepare(query);
    const rows = limit ? stmt.all(limit) : stmt.all();

    return (rows as any[]).map(this.mapRowToBookmark);
  }

  /**
   * Update bookmark enrichment version
   */
  updateEnrichmentVersion(id: string, version: string): void {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE bookmarks
      SET enrichment_version = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run(version, new Date().toISOString(), id);
  }

  /**
   * Get bookmark count by source
   */
  countBySource(): Record<BookmarkSource, number> {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT source, COUNT(*) as count
      FROM bookmarks
      GROUP BY source
    `);

    const rows = stmt.all() as Array<{ source: BookmarkSource; count: number }>;

    const counts: Record<string, number> = {
      twitter: 0,
      linkedin: 0,
      eagle: 0,
    };

    rows.forEach((row) => {
      counts[row.source] = row.count;
    });

    return counts as Record<BookmarkSource, number>;
  }

  /**
   * Delete bookmark by ID
   */
  delete(id: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM bookmarks WHERE id = ?');
    const result = stmt.run(id);

    return result.changes > 0;
  }

  /**
   * Map database row to Bookmark object
   */
  private mapRowToBookmark(row: any): Bookmark {
    return {
      id: row.id,
      source: row.source,
      source_id: row.source_id,
      url: row.url,
      author: row.author,
      author_url: row.author_url,
      content: row.content,
      bookmarked_at: new Date(row.bookmarked_at),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
      enrichment_version: row.enrichment_version,
    };
  }
}
