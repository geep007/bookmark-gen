-- Unified Bookmark Intelligence System - SQLite Schema
-- Version 1.0

-- Categories table (predefined)
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Bookmarks table (core data from MCP sync)
CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK(source IN ('twitter', 'linkedin', 'eagle')),
  source_id TEXT NOT NULL,
  url TEXT NOT NULL,
  author TEXT NOT NULL,
  author_url TEXT,
  content TEXT NOT NULL,
  bookmarked_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  enrichment_version TEXT,
  UNIQUE(source, source_id)
);

-- Bookmark metadata (AI-generated enrichment)
CREATE TABLE IF NOT EXISTS bookmark_metadata (
  id TEXT PRIMARY KEY,
  bookmark_id TEXT NOT NULL,

  -- AI-generated fields
  intent TEXT,
  author_bio TEXT,
  company TEXT,
  primary_topic TEXT,
  key_themes TEXT, -- JSON array stored as text

  -- Category assignment
  category TEXT CHECK(category IN ('Inspo', 'Leads/Markets', 'Tutorials')),
  category_confidence REAL CHECK(category_confidence >= 0 AND category_confidence <= 1),

  -- Quality tracking
  enrichment_quality_score REAL CHECK(enrichment_quality_score >= 0 AND enrichment_quality_score <= 5),

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (bookmark_id) REFERENCES bookmarks(id) ON DELETE CASCADE,
  FOREIGN KEY (category) REFERENCES categories(name)
);

-- Bookmark connections (relationships between bookmarks)
CREATE TABLE IF NOT EXISTS bookmark_connections (
  id TEXT PRIMARY KEY,
  bookmark_id_1 TEXT NOT NULL,
  bookmark_id_2 TEXT NOT NULL,
  connection_type TEXT NOT NULL CHECK(connection_type IN ('same_author', 'shared_topic', 'semantic_similarity', 'temporal_proximity')),
  strength_score REAL NOT NULL CHECK(strength_score >= 0 AND strength_score <= 1),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (bookmark_id_1) REFERENCES bookmarks(id) ON DELETE CASCADE,
  FOREIGN KEY (bookmark_id_2) REFERENCES bookmarks(id) ON DELETE CASCADE,
  UNIQUE(bookmark_id_1, bookmark_id_2, connection_type)
);

-- Enrichment logs (cost and quality tracking)
CREATE TABLE IF NOT EXISTS enrichment_logs (
  id TEXT PRIMARY KEY,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  bookmarks_processed INTEGER NOT NULL,
  tokens_used INTEGER NOT NULL,
  cost REAL NOT NULL,
  model_used TEXT NOT NULL,
  enrichment_type TEXT NOT NULL CHECK(enrichment_type IN ('intent', 'context', 'category', 'connections')),
  metadata TEXT -- JSON for additional info
);

-- Sync history (tracking MCP sync operations)
CREATE TABLE IF NOT EXISTS sync_history (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK(source IN ('twitter', 'linkedin', 'eagle')),
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  total_fetched INTEGER NOT NULL,
  new_inserts INTEGER NOT NULL,
  duplicates_skipped INTEGER NOT NULL,
  errors INTEGER NOT NULL DEFAULT 0,
  error_details TEXT, -- JSON array of error messages
  status TEXT NOT NULL CHECK(status IN ('completed', 'failed', 'partial'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookmarks_source ON bookmarks(source);
CREATE INDEX IF NOT EXISTS idx_bookmarks_author ON bookmarks(author);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON bookmarks(created_at);
CREATE INDEX IF NOT EXISTS idx_bookmarks_enrichment_version ON bookmarks(enrichment_version);

CREATE INDEX IF NOT EXISTS idx_metadata_bookmark_id ON bookmark_metadata(bookmark_id);
CREATE INDEX IF NOT EXISTS idx_metadata_category ON bookmark_metadata(category);
CREATE INDEX IF NOT EXISTS idx_metadata_primary_topic ON bookmark_metadata(primary_topic);

CREATE INDEX IF NOT EXISTS idx_connections_bookmark_1 ON bookmark_connections(bookmark_id_1);
CREATE INDEX IF NOT EXISTS idx_connections_bookmark_2 ON bookmark_connections(bookmark_id_2);

CREATE INDEX IF NOT EXISTS idx_sync_history_source ON sync_history(source);
CREATE INDEX IF NOT EXISTS idx_sync_history_timestamp ON sync_history(timestamp);

-- Insert predefined categories
INSERT OR IGNORE INTO categories (id, name, description, icon) VALUES
  ('inspo', 'Inspo', 'Creative references, aesthetic signals, and inspiration for design and creative work', '💡'),
  ('leads-markets', 'Leads/Markets', 'Potential clients, industries, opportunities, and business development targets', '🎯'),
  ('tutorials', 'Tutorials', 'Learning resources, how-to guides, skill-building content, and educational materials', '📚');
