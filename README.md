# Unified Bookmark Intelligence System

A personal knowledge management tool that transforms scattered social media bookmarks into actionable insights through LLM-powered enrichment and intelligent pattern detection.

## Overview

The Unified Bookmark Intelligence System syncs bookmarks from Twitter and LinkedIn via MCP connectors, enriches them with AI-generated context and intent analysis, and provides a hybrid dashboard-chat interface for query-driven retrieval.

### Key Features

- **MCP Integration**: Sync bookmarks from Twitter (tweetmash) and LinkedIn (linkedmash)
- **Multi-Model LLM Enrichment**: AI-generated intent, context extraction, auto-categorization
- **Three Categories**: Inspo (inspiration), Leads/Markets (prospecting), Tutorials (learning)
- **Query-Driven Interface**: Natural language queries with semantic search
- **Hunter Mode**: Optimized for prospecting and outreach preparation
- **Local-First Architecture**: SQLite + Vector DB, runs on localhost

## Tech Stack

- **Frontend**: Next.js 14+ with TypeScript
- **Backend**: Next.js API routes
- **Database**: SQLite (structured data) + Chroma/Pinecone (vector embeddings)
- **LLM APIs**: OpenAI, Anthropic (multi-model routing)
- **MCP**: Model Context Protocol for bookmark syncing

## Project Structure

```
bookmark-gen/
├── packages/
│   ├── web/              # Next.js application (frontend + API routes)
│   ├── database/         # Database schemas and migrations
│   ├── shared/           # Shared TypeScript types and utilities
│   └── services/         # Core business logic (MCP, Enrichment, Query)
├── data/                 # SQLite database (gitignored)
├── docs/                 # Project documentation
├── .env                  # Environment variables (gitignored)
├── .env.example          # Environment variable template
└── package.json          # Workspace configuration
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- API keys for OpenAI and/or Anthropic
- MCP connector credentials (tweetmash, linkedmash)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bookmark-gen
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your API keys:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `ANTHROPIC_API_KEY`: Your Anthropic API key
   - `MCP_TWITTER_TOKEN`: tweetmash MCP connector token
   - `MCP_LINKEDIN_TOKEN`: linkedmash MCP connector token

4. **Initialize database**
   ```bash
   npm run db:setup
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`

## Usage

### Syncing Bookmarks

1. Navigate to the dashboard
2. Click "Sync Twitter" or "Sync LinkedIn" buttons
3. Monitor progress in the sync modal
4. View synced bookmarks in the recent activity feed

### Enriching Bookmarks

#### Via UI (Coming in Epic 4)
1. Click "Enrich Bookmarks" button
2. Review estimated cost and time
3. Confirm to start batch enrichment
4. Monitor progress and quality metrics

#### Via API (Available Now)
- `POST /api/enrich/batch` - Start batch enrichment
- `GET /api/enrich/batch` - Get cost estimate
- `GET /api/enrich/status` - Check enrichment status
- `GET /api/enrichment/metrics` - View cost and quality metrics

### Querying Bookmarks

1. Enter natural language query in the search box
2. Examples:
   - "show me design agencies I've bookmarked"
   - "find tutorials about Next.js"
   - "give me inspiration for creative work"
3. View results with enriched context
4. Click on bookmarks to see full details

## Development Roadmap

### MVP (Current)
- ✅ Project initialization and setup (Epic 1)
- ✅ Multi-model LLM enrichment pipeline (Epic 2)
  - ✅ LLM client with OpenAI & Anthropic support
  - ✅ Intent & reason generation
  - ✅ Context extraction & author analysis
  - ✅ Auto-categorization (Inspo/Leads/Tutorials)
  - ✅ Connection detection between bookmarks
  - ✅ Batch enrichment with cost tracking
- 🚧 MCP integration (Twitter + LinkedIn - Epic 1 ongoing)
- 🚧 Query and retrieval system (Epic 3)
- 🚧 Dashboard and user interface (Epic 4)

### Phase 2 (Future)
- Eagle visual bookmark integration
- Curator mode enhancements (moodboards)
- Learner mode 30-day challenges
- Graph visualization (Obsidian-style)
- Proactive action prompts

## Documentation

- [Project Brief](docs/brief.md) - Executive summary and problem statement
- [Product Requirements Document](docs/prd.md) - Detailed requirements and user stories
- [Brainstorming Session Results](docs/brainstorming-session-results.md) - Ideation and feature exploration

## Architecture

### Data Flow

1. **Sync**: MCP connectors → Raw bookmarks → SQLite
2. **Enrich**: SQLite bookmarks → LLM enrichment → Metadata + Embeddings
3. **Query**: User query → Semantic search (vector DB) + Filters (SQLite) → Results
4. **Display**: Enriched results → UI (mode-specific formatting)

### Database Schema

- **bookmarks**: Core bookmark data (source, URL, author, content)
- **bookmark_metadata**: AI-generated enrichment (intent, context, category)
- **categories**: Predefined categories (Inspo, Leads/Markets, Tutorials)
- **bookmark_connections**: Relationships between bookmarks
- **enrichment_logs**: Cost tracking and quality metrics

## Cost Management

- Multi-model routing: Cheap models for categorization, expensive for generation
- Manual sync control: User triggers processing
- Cost tracking dashboard: Monitor spend per bookmark
- Target: <$0.02 per bookmark, <$10/month for 500 bookmarks

## Contributing

This is currently a personal-use MVP. If productizing in the future, contribution guidelines will be added.

## License

Private project - All rights reserved
