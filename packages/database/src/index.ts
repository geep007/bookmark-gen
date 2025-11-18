/**
 * Database package - SQLite database client and repositories
 */

export * from './client';
export * from './repositories/bookmarks';
export * from './repositories/metadata';
export * from './repositories/sync-history';
export * from './repositories/connections';
export * from './repositories/enrichment-logs';

// Repository singletons
import { BookmarkRepository } from './repositories/bookmarks';
import { MetadataRepository } from './repositories/metadata';
import { SyncHistoryRepository } from './repositories/sync-history';
import { ConnectionRepository } from './repositories/connections';
import { EnrichmentLogRepository } from './repositories/enrichment-logs';

let bookmarkRepo: BookmarkRepository | null = null;
let metadataRepo: MetadataRepository | null = null;
let syncHistoryRepo: SyncHistoryRepository | null = null;
let connectionRepo: ConnectionRepository | null = null;
let enrichmentLogRepo: EnrichmentLogRepository | null = null;

export function getBookmarkRepository(): BookmarkRepository {
  if (!bookmarkRepo) {
    bookmarkRepo = new BookmarkRepository();
  }
  return bookmarkRepo;
}

export function getMetadataRepository(): MetadataRepository {
  if (!metadataRepo) {
    metadataRepo = new MetadataRepository();
  }
  return metadataRepo;
}

export function getSyncHistoryRepository(): SyncHistoryRepository {
  if (!syncHistoryRepo) {
    syncHistoryRepo = new SyncHistoryRepository();
  }
  return syncHistoryRepo;
}

export function getConnectionRepository(): ConnectionRepository {
  if (!connectionRepo) {
    connectionRepo = new ConnectionRepository();
  }
  return connectionRepo;
}

export function getEnrichmentLogRepository(): EnrichmentLogRepository {
  if (!enrichmentLogRepo) {
    enrichmentLogRepo = new EnrichmentLogRepository();
  }
  return enrichmentLogRepo;
}
