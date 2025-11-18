/**
 * Core bookmark types for the Unified Bookmark Intelligence System
 */

export type BookmarkSource = 'twitter' | 'linkedin' | 'eagle';

export type CategoryType = 'Inspo' | 'Leads/Markets' | 'Tutorials';

export type UserMode = 'Hunter' | 'Curator' | 'Learner';

export interface Bookmark {
  id: string;
  source: BookmarkSource;
  source_id: string;
  url: string;
  author: string;
  author_url?: string;
  content: string;
  bookmarked_at: Date;
  created_at: Date;
  updated_at: Date;
  enrichment_version?: string | null;
}

export interface BookmarkMetadata {
  id: string;
  bookmark_id: string;

  // AI-generated fields
  intent?: string | null;
  author_bio?: string | null;
  company?: string | null;
  primary_topic?: string | null;
  key_themes?: string[] | null;

  // Category assignment
  category?: CategoryType | null;
  category_confidence?: number | null;

  // Quality tracking
  enrichment_quality_score?: number | null;

  created_at: Date;
  updated_at: Date;
}

export interface BookmarkConnection {
  id: string;
  bookmark_id_1: string;
  bookmark_id_2: string;
  connection_type: 'same_author' | 'shared_topic' | 'semantic_similarity' | 'temporal_proximity';
  strength_score: number; // 0-1
  created_at: Date;
}

export interface Category {
  id: string;
  name: CategoryType;
  description: string;
  icon: string;
}

export interface EnrichmentLog {
  id: string;
  timestamp: Date;
  bookmarks_processed: number;
  tokens_used: number;
  cost: number;
  model_used: string;
  enrichment_type: 'intent' | 'context' | 'category' | 'connections';
}

// Enriched bookmark (bookmark + metadata + connections)
export interface EnrichedBookmark extends Bookmark {
  metadata?: BookmarkMetadata;
  connections?: BookmarkConnection[];
  category?: CategoryType;
}

// Query types
export interface QueryRequest {
  query: string;
  filters?: {
    category?: CategoryType;
    source?: BookmarkSource;
    date_from?: Date;
    date_to?: Date;
  };
  limit?: number;
  offset?: number;
}

export interface QueryResult {
  bookmark: Bookmark;
  metadata: BookmarkMetadata;
  relevance_score: number;
  connections: Array<{
    bookmark: Bookmark;
    connection_type: string;
    strength_score: number;
  }>;
}

export interface QueryResponse {
  query_metadata: {
    detected_mode?: UserMode;
    category_filter?: CategoryType;
    execution_time_ms: number;
  };
  results: QueryResult[];
  total_count: number;
}

// Sync types
export interface SyncStatus {
  source: BookmarkSource;
  last_sync_time?: Date;
  total_bookmarks: number;
  last_sync_summary?: {
    total_fetched: number;
    new_inserts: number;
    duplicates_skipped: number;
    errors: number;
  };
}

export interface SyncProgress {
  source: BookmarkSource;
  current: number;
  total: number;
  status: 'in_progress' | 'completed' | 'failed';
  error_message?: string;
}

// Enrichment types
export interface EnrichmentProgress {
  total_bookmarks: number;
  completed: number;
  current_step: 'intent' | 'context' | 'category' | 'connections';
  estimated_time_remaining_ms: number;
  estimated_cost: number;
  current_cost: number;
}

export interface EnrichmentMetrics {
  total_bookmarks_enriched: number;
  average_quality_score: number;
  total_cost: number;
  cost_per_bookmark: number;
  category_distribution: Record<CategoryType, number>;
  low_confidence_count: number;
  breakdown_by_type: Array<{
    type: string;
    cost: number;
    tokens_used: number;
  }>;
}

// Hunter mode specific types
export interface HunterInsight {
  author: string;
  company?: string;
  contact_url: string;
  enriched_context: string;
  outreach_suggestions: string[];
  bookmarks: Bookmark[];
}
