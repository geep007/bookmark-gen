# Architecture Document

**Project:** Unified Bookmark Intelligence System
**Version:** 1.0 (MVP Skeleton)
**Date:** 2025-11-18

---

## Overview

The Unified Bookmark Intelligence System is a local-first web application built with Next.js that transforms scattered social media bookmarks into actionable insights through LLM-powered enrichment and intelligent pattern detection.

## Technology Stack

### Core Technologies

- **Frontend Framework**: Next.js 15+ (React 19)
- **Language**: TypeScript 5.3+
- **Styling**: Tailwind CSS
- **Package Manager**: npm with workspaces

### Backend & Data

- **Database**: SQLite (better-sqlite3) for structured data
- **Vector Database**: Chroma (local) - to be implemented in Epic 3
- **LLM APIs**: OpenAI, Anthropic (multi-model routing)
- **MCP Integration**: Model Context Protocol for Twitter/LinkedIn sync

### Development Tools

- **Linting**: ESLint
- **Build Tool**: Next.js built-in (Turbopack)
- **Type Checking**: TypeScript compiler

## Project Structure

```
bookmark-gen/
├── packages/
│   ├── shared/           # Shared TypeScript types and utilities
│   │   └── src/
│   │       ├── types/    # TypeScript interfaces
│   │       └── utils/    # Validation utilities
│   │
│   ├── database/         # SQLite database layer
│   │   ├── src/
│   │   │   ├── schema.sql         # Database schema
│   │   │   ├── client.ts          # Database connection
│   │   │   └── repositories/      # Data access layer
│   │   │       ├── bookmarks.ts   # Bookmark CRUD
│   │   │       └── metadata.ts    # Metadata CRUD
│   │   └── scripts/
│   │       └── setup.js           # Database initialization
│   │
│   ├── services/         # Business logic services
│   │   └── src/
│   │       ├── config.ts          # Environment config
│   │       ├── mcp/               # MCP connectors (Epic 1)
│   │       ├── enrichment/        # LLM enrichment (Epic 2)
│   │       └── query/             # Search & retrieval (Epic 3)
│   │
│   └── web/              # Next.js application
│       ├── app/
│       │   ├── api/               # API routes
│       │   │   ├── health/        # Health check
│       │   │   ├── sync/          # Bookmark sync
│       │   │   ├── enrich/        # Enrichment
│       │   │   └── query/         # Query processing
│       │   ├── dashboard/         # Dashboard UI (Epic 4)
│       │   ├── layout.tsx         # Root layout
│       │   └── page.tsx           # Home page
│       └── components/            # React components (Epic 4)
│
├── data/                 # SQLite database (gitignored)
├── docs/                 # Documentation
├── .env                  # Environment variables (gitignored)
└── .env.example          # Environment template
```

## Monorepo Architecture

### Workspace Packages

1. **@bookmark-gen/shared**
   - Purpose: Shared TypeScript types and utilities
   - Dependencies: None (base package)
   - Used by: All other packages

2. **@bookmark-gen/database**
   - Purpose: SQLite database schema and repositories
   - Dependencies: better-sqlite3
   - Used by: services, web

3. **@bookmark-gen/services**
   - Purpose: Core business logic (MCP, Enrichment, Query)
   - Dependencies: shared, database
   - Used by: web

4. **@bookmark-gen/web**
   - Purpose: Next.js frontend + API routes
   - Dependencies: shared, database, services, Next.js, React
   - Entry point for the application

## Data Architecture

### Database Schema

#### Core Tables

1. **bookmarks**
   - Primary bookmark data from MCP sync
   - Fields: id, source, source_id, url, author, content, timestamps
   - Indexed on: source, author, created_at, enrichment_version

2. **bookmark_metadata**
   - AI-generated enrichment data
   - Fields: intent, author_bio, company, topic, themes, category, confidence
   - Foreign key to bookmarks (cascade delete)

3. **categories**
   - Predefined categories: Inspo, Leads/Markets, Tutorials
   - Includes name, description, icon

4. **bookmark_connections**
   - Relationships between bookmarks
   - Types: same_author, shared_topic, semantic_similarity, temporal_proximity
   - Strength score: 0-1

5. **enrichment_logs**
   - Cost and quality tracking
   - Fields: bookmarks_processed, tokens_used, cost, model_used, type

6. **sync_history**
   - MCP sync operation tracking
   - Fields: source, total_fetched, new_inserts, duplicates_skipped, errors

### Vector Database (Epic 3)

- **Storage**: Chroma (local) or Pinecone (free tier)
- **Embeddings**: OpenAI text-embedding-3-small
- **Purpose**: Semantic search and similarity queries
- **Data**: Bookmark content + metadata embeddings

## Service Layer Architecture

### MCP Service (Epic 1)

**Purpose**: Sync bookmarks from Twitter and LinkedIn via MCP connectors

**Components**:
- Twitter connector (tweetmash MCP)
- LinkedIn connector (linkedmash MCP)
- Duplicate detection
- Error handling and retry logic

**Data Flow**:
1. User triggers manual sync
2. MCP connector fetches bookmarks
3. Normalize and validate data
4. Check for duplicates (source + source_id)
5. Insert new bookmarks into database
6. Log sync operation to sync_history

### Enrichment Service (Epic 2)

**Purpose**: Transform raw bookmarks into enriched, categorized, connected data

**Components**:
- **LLM Client**: Multi-model routing with cost tracking
- **Intent Generator**: AI-generated reason for bookmarking
- **Context Extractor**: Author bio, company, topic, themes
- **Categorizer**: Auto-assign to Inspo/Leads/Tutorials
- **Connection Detector**: Identify relationships between bookmarks

**Model Routing**:
- Cheap models (GPT-4o-mini, Claude Haiku): Categorization, basic extraction
- Expensive models (GPT-4o, Claude Sonnet): Intent generation, context analysis

**Data Flow**:
1. User triggers batch enrichment
2. Fetch unenriched bookmarks from database
3. For each bookmark:
   - Generate intent (expensive model)
   - Extract context (expensive model)
   - Assign category (cheap model)
4. After batch: Detect connections across all bookmarks
5. Update bookmark_metadata and bookmark_connections tables
6. Log enrichment metrics

### Query Service (Epic 3)

**Purpose**: Enable natural language queries with semantic search

**Components**:
- **Vector DB Client**: Chroma/Pinecone integration
- **Query Parser**: Extract intent, filters, mode from natural language
- **Hybrid Search**: Combine semantic similarity + structured filters
- **Hunter Mode**: Profile-optimized result formatting
- **Result Formatter**: Mode-specific response shaping

**Data Flow**:
1. User enters natural language query
2. Parse query → extract topic, filters, mode
3. Generate query embedding
4. Search vector DB → top-k similar bookmarks
5. Apply structured filters (category, source, date)
6. Hybrid scoring (semantic + metadata boosts)
7. Hydrate results from SQLite
8. Format based on detected mode (Hunter/Curator/Learner)
9. Return enriched results

## API Architecture

### REST Endpoints

#### Health & Status
- `GET /api/health` - Database health check
- `GET /api/sync/status` - Sync history and bookmark counts

#### Sync Operations (Epic 1)
- `POST /api/sync/twitter` - Trigger Twitter bookmark sync
- `POST /api/sync/linkedin` - Trigger LinkedIn bookmark sync

#### Enrichment Operations (Epic 2)
- `POST /api/enrich/batch` - Start batch enrichment
- `GET /api/enrich/status` - Check enrichment progress
- `GET /api/enrichment/metrics` - Get cost and quality metrics

#### Query Operations (Epic 3)
- `POST /api/query` - Execute natural language query

### API Response Patterns

**Success Response**:
```json
{
  "data": { ... },
  "metadata": { ... }
}
```

**Error Response**:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

## Configuration Management

### Environment Variables

Required:
- `DATABASE_PATH`: SQLite database file path
- `VECTOR_DB_TYPE`: 'chroma' or 'pinecone'

LLM Providers (at least one required):
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

MCP Connectors (at least one required):
- `MCP_TWITTER_TOKEN`
- `MCP_LINKEDIN_TOKEN`

Optional Overrides:
- `ENRICHMENT_MODEL_CATEGORY`: Model for categorization
- `ENRICHMENT_MODEL_INTENT`: Model for intent generation
- `ENRICHMENT_MODEL_CONTEXT`: Model for context extraction

### Configuration Loading

The `@bookmark-gen/services/config.ts` module:
1. Validates required environment variables
2. Provides sensible defaults
3. Warns about missing optional configuration
4. Exports typed configuration object

## Cost Optimization Strategy

### Multi-Model Routing

**Cheap Models** (GPT-4o-mini, Claude Haiku):
- Category assignment
- Basic text extraction
- Simple classification tasks

**Expensive Models** (GPT-4o, Claude Sonnet):
- Intent generation (nuanced understanding)
- Context extraction (deep analysis)
- Outreach suggestion generation

**Target Costs**:
- <$0.02 per bookmark enrichment
- <$10/month for 500 bookmarks

### Token Usage Tracking

All LLM calls logged with:
- Model used
- Prompt tokens
- Completion tokens
- Estimated cost
- Task type

Aggregate metrics available via `/api/enrichment/metrics`

## Performance Requirements

### Response Times

- Health check: <500ms
- Sync status: <500ms
- Query execution: <2s (up to 500 bookmarks)
- Semantic search: <500ms
- Batch enrichment: 5-15 min per 100 bookmarks

### Optimizations

1. **Database Indexing**: Source, category, author, created_at
2. **Vector Search**: Limit to top-50 candidates before hybrid scoring
3. **Query Caching**: 5-minute TTL for repeated queries
4. **Connection Pooling**: Reuse SQLite connections
5. **Batch Processing**: Parallel embedding generation

## Security & Privacy

### Data Privacy

- **Local-First**: All data stored locally by default
- **No Telemetry**: No external tracking or analytics
- **API Key Security**: Environment variables only, never committed

### Input Validation

- URL validation for bookmarks
- Category enum validation
- Confidence score bounds (0-1)
- SQL injection prevention (parameterized queries)

## Development Workflow

### Setup

```bash
# Clone and install
npm install

# Configure environment
cp .env.example .env
# Edit .env with API keys

# Initialize database
npm run db:setup

# Start development server
npm run dev
```

### Epic Development Flow

1. **Epic 1**: Foundation & MCP integration
2. **Epic 2**: Enrichment pipeline
3. **Epic 3**: Query system
4. **Epic 4**: Dashboard UI

Each epic builds on previous work, enabling incremental validation.

## Testing Strategy (To Be Implemented)

### Unit Tests
- Repository CRUD operations
- Configuration validation
- Utility functions

### Integration Tests
- MCP sync flow (mocked responses)
- Enrichment pipeline (cached LLM responses)
- Query retrieval (seeded database)

### Manual Testing
- Enrichment quality evaluation
- Query success rate
- UI/UX workflows

## Deployment (MVP = Local)

### Local Development
- Run on localhost:3000
- SQLite database in ./data/
- Chroma vector DB in ./chroma_data/

### Future Cloud Migration Path
- Vercel (Next.js hosting)
- Railway/VPS (full-stack option)
- Replace SQLite with PostgreSQL
- Replace Chroma with Pinecone
- Add authentication and multi-tenancy

## Open Questions & Future Decisions

1. **LLM Abstraction**: Direct API calls vs. LangChain for orchestration
2. **Vector DB Choice**: Chroma (local) vs. Pinecone (cloud)
3. **Migration Tool**: Prisma, Drizzle, or Alembic for schema changes
4. **Eagle Integration**: API availability and integration pattern
5. **Mode Detection**: Explicit UI switches vs. query-inferred modes

---

## Appendix: Epic Mapping

### Epic 1: Foundation & Data Pipeline
- ✅ Story 1.1: Project initialization (completed)
- ⏳ Story 1.2: Database schema (completed)
- ⏳ Story 1.3: Twitter MCP sync (placeholder)
- ⏳ Story 1.4: LinkedIn MCP sync (placeholder)
- ⏳ Story 1.5: API key management (completed)
- ⏳ Story 1.6: Health check API (completed)

### Epic 2: Intelligence Layer & Enrichment
- All stories pending implementation

### Epic 3: Query & Retrieval System
- All stories pending implementation

### Epic 4: Dashboard & User Interface
- All stories pending implementation

---

*Architecture document for MVP skeleton - to be updated as epics are implemented*
