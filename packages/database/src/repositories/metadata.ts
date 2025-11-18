/**
 * Bookmark metadata repository - CRUD operations for enrichment data
 */

import { getDatabase, generateId } from '../client';
import type { BookmarkMetadata, CategoryType } from '@bookmark-gen/shared';

export class MetadataRepository {
  /**
   * Insert or update bookmark metadata
   */
  upsert(metadata: Omit<BookmarkMetadata, 'id' | 'created_at' | 'updated_at'>): BookmarkMetadata {
    const existing = this.findByBookmarkId(metadata.bookmark_id);

    if (existing) {
      return this.update(existing.id, metadata);
    }

    return this.insert(metadata);
  }

  /**
   * Insert new metadata
   */
  private insert(metadata: Omit<BookmarkMetadata, 'id' | 'created_at' | 'updated_at'>): BookmarkMetadata {
    const db = getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO bookmark_metadata (
        id, bookmark_id, intent, author_bio, company, primary_topic,
        key_themes, category, category_confidence, enrichment_quality_score,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      metadata.bookmark_id,
      metadata.intent || null,
      metadata.author_bio || null,
      metadata.company || null,
      metadata.primary_topic || null,
      metadata.key_themes ? JSON.stringify(metadata.key_themes) : null,
      metadata.category || null,
      metadata.category_confidence || null,
      metadata.enrichment_quality_score || null,
      now,
      now
    );

    return this.findById(id)!;
  }

  /**
   * Update existing metadata
   */
  private update(
    id: string,
    metadata: Partial<Omit<BookmarkMetadata, 'id' | 'created_at' | 'updated_at'>>
  ): BookmarkMetadata {
    const db = getDatabase();
    const now = new Date().toISOString();

    const fields = [];
    const values = [];

    if (metadata.intent !== undefined) {
      fields.push('intent = ?');
      values.push(metadata.intent);
    }
    if (metadata.author_bio !== undefined) {
      fields.push('author_bio = ?');
      values.push(metadata.author_bio);
    }
    if (metadata.company !== undefined) {
      fields.push('company = ?');
      values.push(metadata.company);
    }
    if (metadata.primary_topic !== undefined) {
      fields.push('primary_topic = ?');
      values.push(metadata.primary_topic);
    }
    if (metadata.key_themes !== undefined) {
      fields.push('key_themes = ?');
      values.push(JSON.stringify(metadata.key_themes));
    }
    if (metadata.category !== undefined) {
      fields.push('category = ?');
      values.push(metadata.category);
    }
    if (metadata.category_confidence !== undefined) {
      fields.push('category_confidence = ?');
      values.push(metadata.category_confidence);
    }
    if (metadata.enrichment_quality_score !== undefined) {
      fields.push('enrichment_quality_score = ?');
      values.push(metadata.enrichment_quality_score);
    }

    fields.push('updated_at = ?');
    values.push(now);

    values.push(id);

    const stmt = db.prepare(`
      UPDATE bookmark_metadata
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    return this.findById(id)!;
  }

  /**
   * Find metadata by ID
   */
  findById(id: string): BookmarkMetadata | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM bookmark_metadata WHERE id = ?');
    const row = stmt.get(id) as any;

    return row ? this.mapRowToMetadata(row) : null;
  }

  /**
   * Find metadata by bookmark ID
   */
  findByBookmarkId(bookmarkId: string): BookmarkMetadata | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM bookmark_metadata WHERE bookmark_id = ?');
    const row = stmt.get(bookmarkId) as any;

    return row ? this.mapRowToMetadata(row) : null;
  }

  /**
   * Get category distribution
   */
  getCategoryDistribution(): Record<CategoryType, number> {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT category, COUNT(*) as count
      FROM bookmark_metadata
      WHERE category IS NOT NULL
      GROUP BY category
    `);

    const rows = stmt.all() as Array<{ category: CategoryType; count: number }>;

    const distribution: Record<string, number> = {
      Inspo: 0,
      'Leads/Markets': 0,
      Tutorials: 0,
    };

    rows.forEach((row) => {
      distribution[row.category] = row.count;
    });

    return distribution as Record<CategoryType, number>;
  }

  /**
   * Map database row to BookmarkMetadata object
   */
  private mapRowToMetadata(row: any): BookmarkMetadata {
    return {
      id: row.id,
      bookmark_id: row.bookmark_id,
      intent: row.intent,
      author_bio: row.author_bio,
      company: row.company,
      primary_topic: row.primary_topic,
      key_themes: row.key_themes ? JSON.parse(row.key_themes) : null,
      category: row.category,
      category_confidence: row.category_confidence,
      enrichment_quality_score: row.enrichment_quality_score,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }
}
