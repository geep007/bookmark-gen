/**
 * Bookmark Sync Service
 * Orchestrates MCP syncing, duplicate detection, and database storage
 */

import { BookmarkRepository, SyncHistoryRepository } from '@bookmark-gen/database';
import type { BookmarkSource, Bookmark } from '@bookmark-gen/shared';
import type { MCPConnector, MCPBookmark } from './types';
import { TwitterMCPConnector } from './twitter-connector';
import { LinkedInMCPConnector } from './linkedin-connector';

/**
 * Sync summary returned after sync operation
 */
export interface SyncSummary {
  source: BookmarkSource;
  total_fetched: number;
  new_inserts: number;
  duplicates_skipped: number;
  errors: string[];
  status: 'completed' | 'failed' | 'partial';
}

/**
 * Sync progress callback
 */
export type SyncProgressCallback = (progress: {
  current: number;
  total: number;
  message: string;
}) => void;

/**
 * Bookmark sync service
 */
export class BookmarkSyncService {
  private bookmarkRepo = new BookmarkRepository();
  private syncHistoryRepo = new SyncHistoryRepository();
  private twitterConnector: MCPConnector = new TwitterMCPConnector();
  private linkedinConnector: MCPConnector = new LinkedInMCPConnector();

  /**
   * Sync bookmarks from Twitter
   */
  async syncTwitter(onProgress?: SyncProgressCallback): Promise<SyncSummary> {
    return this.syncBookmarks('twitter', this.twitterConnector, onProgress);
  }

  /**
   * Sync bookmarks from LinkedIn
   */
  async syncLinkedIn(onProgress?: SyncProgressCallback): Promise<SyncSummary> {
    return this.syncBookmarks('linkedin', this.linkedinConnector, onProgress);
  }

  /**
   * Generic sync method for any source
   */
  private async syncBookmarks(
    source: BookmarkSource,
    connector: MCPConnector,
    onProgress?: SyncProgressCallback
  ): Promise<SyncSummary> {
    const errors: string[] = [];
    let newInserts = 0;
    let duplicatesSkipped = 0;

    try {
      // Fetch bookmarks from MCP
      if (onProgress) {
        onProgress({ current: 0, total: 0, message: `Connecting to ${source} MCP server...` });
      }

      const result = await connector.fetchBookmarks((current, total) => {
        if (onProgress) {
          onProgress({
            current,
            total,
            message: `Fetching ${source} bookmarks: ${current}/${total}`,
          });
        }
      });

      errors.push(...result.errors);

      if (onProgress) {
        onProgress({
          current: result.bookmarks.length,
          total: result.bookmarks.length,
          message: `Processing ${result.bookmarks.length} bookmarks...`,
        });
      }

      // Process each bookmark
      for (const mcpBookmark of result.bookmarks) {
        try {
          // Check for duplicates
          const existing = this.bookmarkRepo.findBySourceId(source, mcpBookmark.source_id);

          if (existing) {
            duplicatesSkipped++;
            continue;
          }

          // Insert new bookmark
          this.bookmarkRepo.insert({
            source,
            source_id: mcpBookmark.source_id,
            url: mcpBookmark.url,
            author: mcpBookmark.author,
            author_url: mcpBookmark.author_url,
            content: mcpBookmark.content,
            bookmarked_at: mcpBookmark.bookmarked_at,
          });

          newInserts++;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Failed to insert bookmark ${mcpBookmark.source_id}: ${errorMsg}`);
        }
      }

      // Determine status
      let status: 'completed' | 'failed' | 'partial';
      if (result.total_fetched === 0 && errors.length > 0) {
        status = 'failed';
      } else if (errors.length > 0) {
        status = 'partial';
      } else {
        status = 'completed';
      }

      // Create sync summary
      const summary: SyncSummary = {
        source,
        total_fetched: result.total_fetched,
        new_inserts: newInserts,
        duplicates_skipped: duplicatesSkipped,
        errors,
        status,
      };

      // Log to sync history
      this.syncHistoryRepo.insert({
        source,
        total_fetched: summary.total_fetched,
        new_inserts: summary.new_inserts,
        duplicates_skipped: summary.duplicates_skipped,
        errors: errors.length,
        error_details: errors.length > 0 ? errors : null,
        status: summary.status,
      });

      if (onProgress) {
        onProgress({
          current: result.total_fetched,
          total: result.total_fetched,
          message: `Sync ${status}: ${newInserts} new, ${duplicatesSkipped} duplicates`,
        });
      }

      return summary;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown sync error';
      errors.push(errorMsg);

      const summary: SyncSummary = {
        source,
        total_fetched: 0,
        new_inserts: newInserts,
        duplicates_skipped: duplicatesSkipped,
        errors,
        status: 'failed',
      };

      // Log failed sync to history
      this.syncHistoryRepo.insert({
        source,
        total_fetched: 0,
        new_inserts: newInserts,
        duplicates_skipped: duplicatesSkipped,
        errors: errors.length,
        error_details: errors,
        status: 'failed',
      });

      return summary;
    }
  }

  /**
   * Get sync status for a source
   */
  getSyncStatus(source: BookmarkSource) {
    const latestSync = this.syncHistoryRepo.getLatestBySource(source);
    const bookmarkCount = this.bookmarkRepo.countBySource()[source] || 0;

    return {
      source,
      last_sync_time: latestSync?.timestamp,
      total_bookmarks: bookmarkCount,
      last_sync_summary: latestSync
        ? {
            total_fetched: latestSync.total_fetched,
            new_inserts: latestSync.new_inserts,
            duplicates_skipped: latestSync.duplicates_skipped,
            errors: latestSync.errors,
          }
        : undefined,
    };
  }
}
