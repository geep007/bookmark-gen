/**
 * MCP service types and interfaces
 */

import type { BookmarkSource } from '@bookmark-gen/shared';

/**
 * Raw bookmark data from MCP connector
 */
export interface MCPBookmark {
  source_id: string;
  url: string;
  author: string;
  author_url?: string;
  content: string;
  bookmarked_at: Date;
}

/**
 * MCP sync result
 */
export interface MCPSyncResult {
  source: BookmarkSource;
  bookmarks: MCPBookmark[];
  total_fetched: number;
  errors: string[];
}

/**
 * MCP sync progress callback
 */
export type MCPSyncProgressCallback = (current: number, total: number) => void;

/**
 * MCP connector interface
 */
export interface MCPConnector {
  /**
   * Fetch all bookmarks from the platform
   */
  fetchBookmarks(onProgress?: MCPSyncProgressCallback): Promise<MCPSyncResult>;

  /**
   * Test connection to MCP server
   */
  testConnection(): Promise<boolean>;
}
