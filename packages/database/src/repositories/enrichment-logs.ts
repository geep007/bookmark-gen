/**
 * Enrichment logs repository - Tracking cost and quality metrics
 */

import { getDatabase, generateId } from '../client';
import type { EnrichmentLog } from '@bookmark-gen/shared';

export class EnrichmentLogRepository {
  /**
   * Create a new enrichment log entry
   */
  create(log: Omit<EnrichmentLog, 'id' | 'timestamp'>): EnrichmentLog {
    const db = getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO enrichment_logs (
        id, timestamp, bookmarks_processed, tokens_used, cost, model_used, enrichment_type, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      now,
      log.bookmarks_processed,
      log.tokens_used,
      log.cost,
      log.model_used,
      log.enrichment_type,
      null // metadata field for future use
    );

    return this.findById(id)!;
  }

  /**
   * Find log by ID
   */
  findById(id: string): EnrichmentLog | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM enrichment_logs WHERE id = ?');
    const row = stmt.get(id) as any;

    return row ? this.mapRowToLog(row) : null;
  }

  /**
   * Get all logs
   */
  findAll(options?: {
    limit?: number;
    offset?: number;
    enrichment_type?: string;
  }): EnrichmentLog[] {
    const db = getDatabase();
    let query = 'SELECT * FROM enrichment_logs';
    const params: any[] = [];

    if (options?.enrichment_type) {
      query += ' WHERE enrichment_type = ?';
      params.push(options.enrichment_type);
    }

    query += ' ORDER BY timestamp DESC';

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

    return rows.map(this.mapRowToLog);
  }

  /**
   * Get total cost
   */
  getTotalCost(): number {
    const db = getDatabase();
    const stmt = db.prepare('SELECT SUM(cost) as total FROM enrichment_logs');
    const row = stmt.get() as { total: number | null };

    return row.total || 0;
  }

  /**
   * Get total tokens used
   */
  getTotalTokens(): number {
    const db = getDatabase();
    const stmt = db.prepare('SELECT SUM(tokens_used) as total FROM enrichment_logs');
    const row = stmt.get() as { total: number | null };

    return row.total || 0;
  }

  /**
   * Get total bookmarks enriched
   */
  getTotalEnriched(): number {
    const db = getDatabase();
    const stmt = db.prepare('SELECT SUM(bookmarks_processed) as total FROM enrichment_logs');
    const row = stmt.get() as { total: number | null };

    return row.total || 0;
  }

  /**
   * Get cost by enrichment type
   */
  getCostByType(): Array<{ enrichment_type: string; total_cost: number; total_tokens: number }> {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT
        enrichment_type,
        SUM(cost) as total_cost,
        SUM(tokens_used) as total_tokens
      FROM enrichment_logs
      GROUP BY enrichment_type
    `);

    return stmt.all() as Array<{ enrichment_type: string; total_cost: number; total_tokens: number }>;
  }

  /**
   * Get recent logs
   */
  getRecent(limit: number = 10): EnrichmentLog[] {
    return this.findAll({ limit });
  }

  /**
   * Map database row to EnrichmentLog object
   */
  private mapRowToLog(row: any): EnrichmentLog {
    return {
      id: row.id,
      timestamp: new Date(row.timestamp),
      bookmarks_processed: row.bookmarks_processed,
      tokens_used: row.tokens_used,
      cost: row.cost,
      model_used: row.model_used,
      enrichment_type: row.enrichment_type,
    };
  }
}
