# Unified Bookmark Intelligence System Product Requirements Document (PRD)

**Project Name:** Unified Bookmark Intelligence System
**PRD Version:** 1.0
**Date:** 2025-11-18
**Author:** John (PM)
**Based on:** Project Brief v1.0 by Geet Parmar

---

## Goals and Background Context

### Goals

- Reduce prospecting preparation time by 60% (from 30 min to <10 min per prospect)
- Increase bookmark actionability from 5% to 40%
- Enable query-driven retrieval with >70% query success rate
- Achieve daily active use in at least one mode (Hunter/Curator/Learner) within 30 days
- Maintain LLM API costs below $10/month for 500 bookmarks (<$0.02 per bookmark enrichment)
- Deliver enrichment quality score >4/5 for AI-generated intent and context
- Unify scattered bookmarks from Twitter and LinkedIn into single intelligent interface
- Enable 30-day skill-building challenge with 20+ public posts by Month 3

### Background Context

Knowledge workers routinely bookmark valuable content across Twitter/X and LinkedIn, but these bookmarks become invisible assets trapped in platform silos. The average user saves 50-200 bookmarks monthly but revisits less than 5%, wasting 15-30 minutes weekly searching for "where did I save that thing about X?" Existing solutions fall short: platform-native tools are siloed and browse-only, read-later apps don't handle social profiles, note-taking apps require excessive manual curation, and CRM tools don't support exploratory bookmarking across creative/learning contexts.

With the maturation of MCP (Model Context Protocol) and affordable LLM APIs, we can now build an intelligent enrichment pipeline that transforms scattered saves into actionable strategic intelligence. The Unified Bookmark Intelligence System addresses this gap by syncing bookmarks via MCP connectors, enriching them with AI-generated intent analysis and pattern detection, and providing a query-driven hybrid dashboard-chat interface that surfaces relevant bookmarks with enriched context. The system supports three distinct modes—Hunter (prospecting), Curator (creative exploration), and Learner (skill development)—enabling users to start with "I need X" rather than browsing hoping to find something relevant.

### Change Log

| Date       | Version | Description                                    | Author      |
|------------|---------|------------------------------------------------|-------------|
| 2025-11-18 | 1.0     | Initial PRD creation based on Project Brief v1.0 | John (PM) |

---

## Requirements

### Functional Requirements

**FR1:** The system shall sync bookmarks from Twitter via the tweetmash MCP connector with a manual sync button and progress indicator.

**FR2:** The system shall sync bookmarks from LinkedIn via the linkedmash MCP connector with a manual sync button and progress indicator.

**FR3:** The system shall enrich each bookmark with AI-generated intent/reason explaining why the user likely saved it.

**FR4:** The system shall auto-extract context from bookmarks including bio, company, topic, and key themes.

**FR5:** The system shall auto-categorize bookmarks into one of three categories: Inspo (creative references), Leads/Markets (potential clients/industries), or Tutorials (learning resources).

**FR6:** The system shall detect and suggest connections between related bookmarks across platforms.

**FR7:** The system shall provide a visual dashboard showing bookmark patterns, category distribution, and recent activity.

**FR8:** The system shall provide a conversational query interface where users can ask questions in natural language.

**FR9:** The system shall support Hunter Mode queries that return enriched profiles with bio, company, intent, and suggested outreach angles when querying by topic/industry.

**FR10:** The system shall return query results in under 2 seconds for collections up to 500 bookmarks.

**FR11:** The system shall allow users to override AI-suggested categories manually.

**FR12:** The system shall display enrichment quality indicators (e.g., confidence scores) for AI-generated metadata.

**FR13:** The system shall process batch enrichment of 100 bookmarks within 5-15 minutes.

**FR14:** The system shall store bookmarks with structured metadata in SQLite database.

**FR15:** The system shall perform semantic search using vector embeddings for query-driven retrieval.

### Non-Functional Requirements

**NFR1:** The system shall maintain LLM API enrichment costs below $0.02 per bookmark.

**NFR2:** The system shall achieve semantic search query latency under 500ms.

**NFR3:** The system shall run as a local-first web application on localhost without requiring cloud hosting.

**NFR4:** The system shall support modern browsers (Chrome, Firefox, Safari, Edge) on macOS, Windows, and Linux.

**NFR5:** The system shall store API keys in environment variables and never commit them to version control.

**NFR6:** The system shall not send telemetry or tracking data to external services.

**NFR7:** The system shall maintain data privacy by keeping all bookmark data local by default.

**NFR8:** The system shall use a monorepo structure with clear separation between frontend, backend, database, and LLM service layers.

**NFR9:** The system shall support easy cloud migration path (Vercel, Railway, or self-hosted VPS) for future productization.

**NFR10:** The system shall achieve enrichment quality ratings of 4+/5 for intent accuracy based on user evaluation.

**NFR11:** The system shall provide mobile-responsive UI while optimizing for desktop-first experience.

**NFR12:** The system shall handle rate limiting and errors from MCP connectors gracefully with user-friendly error messages.

---

## User Interface Design Goals

### Overall UX Vision

The interface should feel like a **personal intelligence assistant** rather than a traditional bookmark manager. The experience balances two paradigms: a **visual dashboard for pattern discovery** (supporting serendipitous exploration and Curator mode) and a **conversational query interface for targeted retrieval** (supporting Hunter and Learner modes). The design philosophy is "query-first, browse-optional" - users should be able to accomplish most tasks by asking questions rather than navigating complex menus or folder hierarchies.

The aesthetic should convey **clarity, intelligence, and approachability** - not overwhelming enterprise software, but also not overly casual. Think: lightweight desktop analytics tool meets thoughtful note-taking interface. Information density should be optimized for desktop use while remaining digestible, with generous whitespace and clear visual hierarchy.

### Key Interaction Paradigms

- **Natural Language Query as Primary Input:** Central text input field always visible, supporting conversational queries like "show me design agencies I've bookmarked" or "find tutorials about Next.js"
- **Dashboard as Ambient Awareness:** Visual widgets showing bookmark volume by category, recent syncs, emerging patterns - glanceable context without requiring interaction
- **Mode-Aware Responses:** System adapts response format based on detected mode (Hunter = enriched profiles for outreach; Curator = visual grid; Learner = structured learning path)
- **Progressive Disclosure:** Initial results show summary cards; clicking expands to full enriched context, connections, and original bookmark source
- **Manual Control Transparency:** Sync and enrichment actions require explicit user trigger with clear progress indicators - no hidden background processing
- **Override-Friendly AI:** All AI-generated metadata (category, intent, connections) presented as suggestions with visible edit/override affordances

### Core Screens and Views

1. **Main Dashboard** - Landing screen with category breakdown widgets, recent activity feed, query input field, manual sync button
2. **Query Results View** - List or grid of matching bookmarks with enriched metadata cards, relevance scoring, connection indicators
3. **Bookmark Detail View** - Expanded view of single bookmark showing original content, full enriched context, related bookmarks, category assignment with override option
4. **Sync Progress Modal** - Modal overlay during MCP sync operations showing platform-specific progress (Twitter: X/Y bookmarks fetched, LinkedIn: X/Y)
5. **Enrichment Queue View** - Shows batch enrichment progress, estimated time remaining, cost estimate for current batch, pause/resume controls
6. **Settings/Configuration Screen** - API key management, model selection preferences, cost tracking dashboard, sync history

### Accessibility

**Target: WCAG AA compliance**

The MVP targets tech-savvy solo entrepreneurs who may work extended hours and benefit from accessibility features (keyboard navigation, screen reader support, sufficient color contrast). WCAG AA is achievable without significant development overhead and future-proofs for broader audience. AAA is unnecessary for personal-use MVP; can be addressed in productization phase if needed.

### Branding

**Minimal branding for MVP - focus on functional clarity over visual identity.**

No custom branding, logo, or color palette required for personal-use application. Use clean, neutral design system:
- Neutral color palette (grays, blues for interactive elements, amber/yellow for warnings/costs)
- System fonts or simple web-safe typography
- Iconography for categories (💡 Inspo, 🎯 Leads/Markets, 📚 Tutorials) to aid quick visual scanning

### Target Device and Platforms

**Primary: Web Responsive (Desktop-First)**

The application will be a **web-responsive interface optimized for desktop browsers** (minimum viewport width ~1280px) while remaining functional on tablets and mobile devices. Desktop-first approach reflects:
- Primary use case (Hunter mode prospecting prep) typically happens at desk during work hours
- Dashboard pattern visualization benefits from larger screen real estate
- Query interface typing is faster on physical keyboards
- Local-first localhost architecture naturally supports desktop environment

**Supported platforms:**
- macOS, Windows, Linux desktop environments
- Modern browsers: Chrome, Firefox, Safari, Edge (latest 2 versions)
- Tablet support (iPad, Android tablets) as secondary use case
- Mobile phone support (iOS, Android) functional but not optimized for MVP

---

## Technical Assumptions

### Repository Structure: Monorepo

**Decision:** Single monorepo containing all application code (frontend, backend, database schemas, LLM services, MCP integration layer).

**Rationale:**
- **Simplified development workflow:** Solo developer (Geet) benefits from single checkout, single dependency management, unified build process
- **Shared TypeScript types:** Frontend and backend can share bookmark schema definitions, API contracts, and enrichment metadata types without duplication
- **Atomic changes:** Features touching multiple layers (e.g., adding new enrichment field requires DB schema, API endpoint, and UI update) can be committed atomically
- **Reduced coordination overhead:** No need to manage versioning across multiple repos during rapid MVP iteration
- **Clear migration path:** Monorepo structure doesn't prevent future polyrepo split if productization requires separate deployment pipelines

**Technology choice:** Use workspace features (npm workspaces, pnpm workspaces, or Yarn workspaces) for dependency management.

### Service Architecture

**Decision:** Monolithic full-stack application with modular service layers within a single deployment unit.

**Architecture components:**
1. **Frontend Layer** - React/Svelte UI components, query interface, dashboard widgets
2. **API Layer** - Backend routes/endpoints for CRUD operations, query processing, sync triggers
3. **MCP Connector Service** - Abstraction layer for tweetmash and linkedmash MCP integrations
4. **Enrichment Service** - LLM orchestration with multi-model routing (cheap models for categorization, expensive for intent generation)
5. **Query Service** - Semantic search coordinator combining vector similarity with structured filters
6. **Database Layer** - SQLite for structured data, Chroma/Pinecone for vector embeddings

**Rationale:**
- **Local-first requirement:** Monolithic deployment simplifies running on localhost - single process, no container orchestration needed
- **Development velocity:** Fewer moving parts during MVP iteration; debugging stays within single codebase
- **Cost optimization:** No hosting costs for multiple services; single LLM API usage tracking
- **Future flexibility:** Modular service boundaries within monolith enable clean extraction to microservices if productization requires scale or multi-tenancy
- **Appropriate for scale:** MVP targets 500-1000 bookmarks (single user); monolith handles this easily

### Testing Requirements

**Decision:** Unit + Integration testing with local testability emphasis

**Testing strategy:**
- **Unit tests:** Core logic in Enrichment Service (prompt construction, model routing), Query Service (search ranking algorithms), category assignment rules
- **Integration tests:** End-to-end flows including MCP sync → enrichment pipeline → database storage → query retrieval
- **Manual testing:** UI/UX workflows, enrichment quality evaluation (human-in-the-loop validation for 4+/5 quality goal)
- **No E2E automation initially:** Manual testing via localhost browser sufficient for MVP; automated E2E can be added if productizing

**Local testability priorities:**
- **Mock MCP responses:** Unit tests shouldn't require live Twitter/LinkedIn connections - fixture data for typical bookmark payloads
- **Deterministic LLM testing:** Use cached/mocked enrichment responses for regression tests; actual LLM calls only in integration tests
- **Database seeding:** Predefined bookmark collections at various scales (10, 100, 500 bookmarks) for query performance testing

### Additional Technical Assumptions and Requests

**Framework Choice: Next.js (React) vs. SvelteKit**
- **Preference:** Let Architect choose based on trade-offs, but lean toward **Next.js** for larger ecosystem, more learning resources, and proven production readiness
- **Requirements:** Must support API routes/endpoints in same framework, SSR or SSG for dashboard performance, easy localhost development server
- **Constraint:** Whichever framework chosen must have straightforward SQLite integration and support for running background jobs (batch enrichment)

**LLM Orchestration: Direct API Calls with Custom Model Routing**
- **Preference:** Start with direct OpenAI/Anthropic API calls rather than LangChain abstraction
- **Rationale:** For MVP, direct calls offer more cost transparency and simpler debugging; LangChain adds abstraction overhead that may not be needed for initial multi-model routing
- **Open to Architect's recommendation:** If LangChain provides significant value for connection detection or semantic similarity, include it

**Vector Database: Chroma Local (Preferred) or Pinecone Free Tier**
- **Preference:** Start with **Chroma running locally** to maintain local-first architecture and avoid external dependencies
- **Fallback:** Pinecone free tier if Chroma performance is insufficient or local resource usage is problematic
- **Requirements:** Must support embedding storage for semantic search, similarity queries under 500ms (NFR2), easy data export for future migration

**Database Schema Flexibility:**
- **Assumption:** Schema will evolve during MVP - use SQLite with Alembic/Prisma migrations or similar tool to support iterative schema changes
- **Requirement:** Include `created_at`, `updated_at`, `enrichment_version` fields to support re-enrichment and schema migration scenarios

**API Key Management:**
- **Requirement:** Use `.env` file for local development (excluded from git via `.gitignore`), clear documentation for required keys (OpenAI, Anthropic, MCP connectors)
- **Security:** No API keys in code, environment variables only (NFR5)

**Deployment Simplicity for MVP:**
- **Requirement:** Single command to start application (`npm run dev` or similar)
- **Documentation:** Clear README with setup steps: clone repo, install dependencies, configure `.env`, seed sample data, run dev server
- **Future migration:** Architecture should support deployment to Vercel (for Next.js) or Railway/VPS (for SvelteKit) without major refactor

**Cost Tracking:**
- **Requirement:** Log all LLM API calls with model, token count, estimated cost; display cumulative cost in Settings screen
- **Rationale:** NFR1 requires <$0.02/bookmark; need visibility to validate and optimize model routing

**Eagle Integration Preparation (Phase 2):**
- **Assumption:** Eagle will require similar enrichment pipeline (visual content → AI-generated description/tags/connections)
- **Request to Architect:** Design enrichment service with abstraction for "bookmark source" (Twitter, LinkedIn, Eagle) so adding Eagle doesn't require pipeline refactor

**Error Handling for MCP Reliability:**
- **Assumption:** tweetmash/linkedmash MCPs may have rate limits, downtime, or API changes
- **Requirement:** Graceful error handling with user-friendly messages (NFR12), sync resume/retry logic, partial success handling (e.g., "120/150 Twitter bookmarks synced, 30 failed due to rate limit")

---

## Epic List

**Epic 1: Foundation & Data Pipeline**
_Goal:_ Establish project infrastructure, MCP integration, and core database schema while delivering a functional bookmark sync capability that validates the technical stack.

**Epic 2: Intelligence Layer & Enrichment**
_Goal:_ Implement multi-model LLM enrichment pipeline that transforms raw bookmarks into actionable intelligence with intent analysis, context extraction, categorization, and connection detection.

**Epic 3: Query & Retrieval System**
_Goal:_ Build semantic search and query processing engine that enables natural language queries with sub-2-second response times and relevance-ranked results.

**Epic 4: Dashboard & User Interface**
_Goal:_ Create hybrid dashboard-chat interface with visual pattern displays, query input, bookmark detail views, and enrichment controls that deliver the complete user experience.

---

## Epic 1: Foundation & Data Pipeline

**Epic Goal:** Establish the technical foundation for the Unified Bookmark Intelligence System by setting up the development environment, repository structure, database schema, and MCP integration layer. By the end of this epic, the system can sync bookmarks from Twitter and LinkedIn via manual triggers, store them in a local SQLite database, and display basic sync status—validating the core data ingestion pipeline and technical stack choices.

### Story 1.1: Project Initialization & Repository Setup

As a **developer**,
I want **a fully initialized monorepo with framework, dependencies, and development tooling configured**,
so that **I can begin feature development with a consistent, production-ready foundation**.

#### Acceptance Criteria

1. Monorepo is initialized with Next.js (or SvelteKit per Architect's decision) using TypeScript
2. Workspace structure includes `/packages/frontend`, `/packages/backend`, `/packages/database`, `/packages/shared` (or equivalent modular structure)
3. ESLint and Prettier are configured with consistent code style rules
4. Git repository is initialized with `.gitignore` excluding `node_modules`, `.env`, and build artifacts
5. Package manager (npm/pnpm/yarn) workspace configuration enables shared dependencies
6. Development server starts successfully with `npm run dev` and displays a "Hello World" or health-check page
7. README.md includes setup instructions: clone, install, configure `.env.example`, run dev server
8. Environment variable template (`.env.example`) is created with placeholders for API keys

### Story 1.2: Database Schema & SQLite Setup

As a **developer**,
I want **a SQLite database with core schema for bookmarks, categories, and metadata**,
so that **I can persist synced bookmark data locally with proper structure and migrations**.

#### Acceptance Criteria

1. SQLite database file is created in project directory (e.g., `/data/bookmarks.db`) and excluded from git
2. Schema includes `bookmarks` table with fields: `id`, `source` (Twitter/LinkedIn), `source_id`, `url`, `author`, `content`, `bookmarked_at`, `created_at`, `updated_at`, `enrichment_version`
3. Schema includes `categories` table with predefined entries: Inspo, Leads/Markets, Tutorials
4. Schema includes `bookmark_metadata` table for AI-generated enrichment fields (linked to bookmarks via foreign key)
5. Migration tooling (Prisma/Drizzle/Alembic) is configured to support schema evolution
6. Database connection module exports typed query functions for CRUD operations
7. Initial migration successfully creates all tables when running setup script
8. Sample seed data (5-10 mock bookmarks) can be inserted via seed script for testing

### Story 1.3: MCP Integration - Twitter Bookmark Sync

As a **user**,
I want **to manually sync my Twitter bookmarks via the tweetmash MCP connector**,
so that **I can ingest my existing Twitter bookmarks into the system for enrichment and querying**.

#### Acceptance Criteria

1. MCP client library is integrated and configured with tweetmash connector
2. API endpoint `/api/sync/twitter` triggers Twitter bookmark sync when called
3. Sync process fetches all available Twitter bookmarks via tweetmash MCP
4. Each fetched bookmark is inserted into `bookmarks` table with `source='twitter'`, capturing: author handle, tweet URL, content/text, timestamp
5. Duplicate detection prevents re-importing bookmarks with same `source_id`
6. Sync progress is logged to console: "Fetched 50/120 Twitter bookmarks..."
7. Sync completion returns summary: total fetched, new inserts, duplicates skipped, errors encountered
8. Error handling gracefully manages rate limits, network failures, or MCP unavailability with user-friendly messages
9. Manual test: Calling endpoint successfully syncs at least 10 real Twitter bookmarks into database

### Story 1.4: MCP Integration - LinkedIn Bookmark Sync

As a **user**,
I want **to manually sync my LinkedIn bookmarks via the linkedmash MCP connector**,
so that **I can ingest my existing LinkedIn bookmarks into the system for enrichment and querying**.

#### Acceptance Criteria

1. MCP client library is configured with linkedmash connector
2. API endpoint `/api/sync/linkedin` triggers LinkedIn bookmark sync when called
3. Sync process fetches all available LinkedIn bookmarks via linkedmash MCP
4. Each fetched bookmark is inserted into `bookmarks` table with `source='linkedin'`, capturing: author name, profile URL or post URL, content/description, timestamp
5. Duplicate detection prevents re-importing bookmarks with same `source_id`
6. Sync progress is logged to console: "Fetched 25/60 LinkedIn bookmarks..."
7. Sync completion returns summary: total fetched, new inserts, duplicates skipped, errors encountered
8. Error handling gracefully manages rate limits, network failures, or MCP unavailability with user-friendly messages
9. Manual test: Calling endpoint successfully syncs at least 10 real LinkedIn bookmarks into database

### Story 1.5: API Key Management & Environment Configuration

As a **user**,
I want **secure API key management with clear configuration instructions**,
so that **I can safely store credentials for MCP connectors and LLM services without risk of exposure**.

#### Acceptance Criteria

1. `.env.example` file documents all required API keys: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `MCP_TWITTER_TOKEN`, `MCP_LINKEDIN_TOKEN` (or equivalent)
2. Application startup validates presence of required environment variables and displays helpful error messages if missing
3. API keys are loaded via environment variable access (never hardcoded)
4. `.gitignore` includes `.env` to prevent accidental commits
5. README.md includes section on "API Key Setup" with step-by-step instructions for obtaining keys
6. Settings configuration module exports typed environment config object
7. Manual test: Starting app without `.env` file displays clear error; adding `.env` with valid keys allows successful startup

### Story 1.6: Sync Status API & Basic Health Check

As a **user**,
I want **API endpoints to check sync status and application health**,
so that **I can verify the system is running correctly and monitor bookmark sync progress**.

#### Acceptance Criteria

1. API endpoint `/api/health` returns status 200 with JSON: `{ status: "ok", database: "connected", timestamp: "..." }`
2. API endpoint `/api/sync/status` returns sync history: last sync time for Twitter and LinkedIn, total bookmarks per source, last sync summary
3. Database query fetches bookmark counts grouped by source (Twitter, LinkedIn)
4. Health check validates database connectivity and returns error status if database is unavailable
5. Sync status includes error information from last sync attempt if applicable
6. Response times for both endpoints are under 500ms
7. Manual test: Calling `/api/health` after startup confirms system is operational; calling `/api/sync/status` after syncing shows accurate counts

---

## Epic 2: Intelligence Layer & Enrichment

**Epic Goal:** Transform raw bookmarks into actionable intelligence by implementing a multi-model LLM enrichment pipeline that generates intent analysis, extracts context, assigns categories, and detects connections between bookmarks. By the end of this epic, the system can process batches of bookmarks with AI-generated metadata, achieving 4+/5 enrichment quality while maintaining costs below $0.02 per bookmark.

### Story 2.1: LLM Client Configuration & Model Routing

As a **developer**,
I want **a configurable LLM client with multi-model routing logic**,
so that **I can optimize costs by using cheaper models for simple tasks and expensive models for complex generation**.

#### Acceptance Criteria

1. LLM client module supports both OpenAI and Anthropic API integration
2. Model routing configuration maps tasks to models: categorization → GPT-4o-mini/Claude Haiku (cheap), intent generation → GPT-4o/Claude Sonnet (expensive)
3. Client includes retry logic with exponential backoff for rate limit errors
4. Token usage is tracked and logged for each API call: model name, prompt tokens, completion tokens, estimated cost
5. Environment variables allow model selection override for testing (e.g., `ENRICHMENT_MODEL_CATEGORY`, `ENRICHMENT_MODEL_INTENT`)
6. Client returns structured responses with error handling for malformed JSON or API failures
7. Cost estimation function calculates total cost based on model pricing and token counts
8. Manual test: Making test API calls to both providers successfully returns responses and logs token usage

### Story 2.2: Intent & Reason Enrichment

As a **user**,
I want **AI-generated intent and reason for why I bookmarked each item**,
so that **I can understand my original motivation when revisiting bookmarks later**.

#### Acceptance Criteria

1. Enrichment function accepts bookmark object (author, content, URL, source) and returns generated intent string
2. Prompt engineering generates concise intent statements (1-2 sentences) answering "Why did the user likely save this?"
3. Intent analysis considers: content topic, author's role/expertise, potential use cases (prospecting, inspiration, learning)
4. Generated intent is stored in `bookmark_metadata` table linked to bookmark ID
5. Enrichment process handles various content types: tweets (short text), LinkedIn posts (longer content + profile context), thread/carousel posts
6. Error handling for empty content or API failures stores null intent with error flag
7. Batch processing function enriches multiple bookmarks sequentially with progress logging
8. Manual test: Enriching 10 diverse bookmarks produces relevant, non-generic intent statements rated 4+/5 for accuracy

### Story 2.3: Context Extraction & Author Analysis

As a **user**,
I want **automatically extracted context including author bio, company, topic, and key themes**,
so that **I have rich contextual information for each bookmark without manual research**.

#### Acceptance Criteria

1. Context extraction function analyzes bookmark content and returns structured metadata: author_bio, company/affiliation, primary_topic, key_themes (array)
2. For Twitter bookmarks: Extract author bio from profile data if available via MCP, identify company mentions in bio
3. For LinkedIn bookmarks: Extract company/position from profile context, identify industry/expertise
4. Topic extraction identifies main subject (e.g., "Design Systems", "Sales Automation", "React Hooks")
5. Key themes extraction returns 2-5 relevant tags/themes (e.g., ["Component Architecture", "Accessibility", "TypeScript"])
6. Extracted context is stored in `bookmark_metadata` table with structured JSON fields
7. Handles missing data gracefully (e.g., author with no bio returns null for bio field)
8. Manual test: Enriching bookmarks from different domains (design, development, business) accurately extracts context fields

### Story 2.4: Category Assignment & Classification

As a **user**,
I want **bookmarks automatically categorized into Inspo, Leads/Markets, or Tutorials**,
so that **I can quickly filter bookmarks by use case without manual organization**.

#### Acceptance Criteria

1. Category assignment function analyzes bookmark content and metadata, returns one of three categories: "Inspo", "Leads/Markets", "Tutorials"
2. Classification logic uses cheaper LLM model (GPT-4o-mini/Claude Haiku) to reduce costs
3. Category assignment considers: content type (visual/creative → Inspo, profile/company → Leads, how-to/guide → Tutorials), author context, user intent from Story 2.2
4. Assigned category is stored in `bookmark_metadata` table with confidence score (0-1)
5. Confidence score <0.7 flags bookmark for potential user review/override
6. Batch categorization processes all un-categorized bookmarks in single pass
7. Category distribution logging shows breakdown across three categories for quality validation
8. Manual test: Categorizing 30 bookmarks (10 per expected category) achieves >80% accuracy on first pass

### Story 2.5: Connection Detection Between Bookmarks

As a **user**,
I want **the system to detect and suggest connections between related bookmarks**,
so that **I can discover patterns and relationships that wouldn't be obvious from browsing**.

#### Acceptance Criteria

1. Connection detection algorithm identifies related bookmarks based on: shared authors, similar topics/themes, temporal proximity, semantic similarity
2. Semantic similarity uses basic text comparison (topic overlap, theme matching) without requiring vector embeddings (lightweight MVP approach)
3. Connections are scored by strength: strong (same author + related topic), medium (shared themes), weak (temporal proximity only)
4. Connection data is stored in `bookmark_connections` junction table with fields: bookmark_id_1, bookmark_id_2, connection_type, strength_score
5. Connection detection runs after enrichment batch completes, analyzing all bookmarks with complete metadata
6. Maximum 5 connections per bookmark to avoid noise (prioritize strongest connections)
7. Connection detection logs summary: "Found 45 connections across 120 bookmarks (avg 0.75 connections/bookmark)"
8. Manual test: Syncing bookmarks with known relationships (e.g., multiple tweets from same thought leader, LinkedIn profiles in same industry) successfully detects connections

### Story 2.6: Batch Enrichment Pipeline & Progress Tracking

As a **user**,
I want **to trigger batch enrichment with progress tracking and cost estimates**,
so that **I can process all un-enriched bookmarks while monitoring progress and staying within budget**.

#### Acceptance Criteria

1. API endpoint `/api/enrich/batch` triggers enrichment pipeline for all bookmarks where `enrichment_version` is null or outdated
2. Enrichment pipeline orchestrates Stories 2.2, 2.3, 2.4, 2.5 in sequence: intent → context → category → connections
3. Progress tracking updates status object: total bookmarks, completed, current step, estimated time remaining, estimated cost
4. Cost estimation shown before starting: "This batch will enrich 100 bookmarks at estimated cost $1.50. Proceed?"
5. Progress polling endpoint `/api/enrich/status` returns real-time progress during batch processing
6. Enrichment logs detailed metrics: total API calls, tokens used, actual cost, average time per bookmark, quality flags (low confidence categories)
7. Batch processing handles errors gracefully: skips failed bookmarks, continues processing, reports errors at end
8. Batch completes enrichment of 100 bookmarks within 5-15 minutes (FR13 requirement)
9. Manual test: Enriching batch of 50+ bookmarks completes successfully with accurate progress tracking and cost under $1.00

### Story 2.7: Enrichment Quality Dashboard & Cost Tracking

As a **user**,
I want **visibility into enrichment quality metrics and cumulative API costs**,
so that **I can validate the intelligence layer is performing well and staying within budget**.

#### Acceptance Criteria

1. API endpoint `/api/enrichment/metrics` returns: total bookmarks enriched, average enrichment quality score, total API cost, cost per bookmark, category distribution, low-confidence count
2. Enrichment metrics stored in `enrichment_logs` table tracking: timestamp, bookmarks_processed, tokens_used, cost, model_used
3. Cost tracking calculates cumulative spend across all enrichment operations
4. Quality metrics aggregate confidence scores and flag bookmarks needing review
5. Dashboard data includes breakdown by enrichment type: intent generation cost, context extraction cost, categorization cost
6. Cost per bookmark calculation validates NFR1 requirement (<$0.02/bookmark)
7. Metrics endpoint response time under 500ms
8. Manual test: After enriching 100+ bookmarks, metrics accurately reflect total cost and maintain <$0.02/bookmark average

---

## Epic 3: Query & Retrieval System

**Epic Goal:** Build a semantic search and query processing engine that enables natural language queries with sub-2-second response times, relevance-ranked results, and Hunter mode functionality. By the end of this epic, users can query bookmarks via API endpoints using conversational language and receive enriched results optimized for different use cases.

### Story 3.1: Vector Database Setup & Embedding Generation

As a **developer**,
I want **a vector database storing embeddings for semantic search**,
so that **I can perform similarity-based queries on bookmark content and metadata**.

#### Acceptance Criteria

1. Chroma vector database is initialized locally within project directory
2. Embedding generation function creates vector embeddings from bookmark fields: content, intent, context, themes
3. Embeddings are generated using OpenAI text-embedding-3-small or similar cost-effective model
4. Vector database schema stores: bookmark_id, embedding_vector, metadata (category, source, author)
5. Batch embedding function processes all enriched bookmarks and stores vectors
6. Database supports similarity search queries returning top-k results with similarity scores
7. Embedding cost tracking logs tokens used and cost per embedding
8. Manual test: Generating embeddings for 100 bookmarks completes in <5 minutes with cost <$0.10

### Story 3.2: Natural Language Query Parser

As a **user**,
I want **to query bookmarks using natural language questions**,
so that **I can find relevant content without learning complex search syntax**.

#### Acceptance Criteria

1. Query parser accepts natural language input (e.g., "show me design agencies I've bookmarked")
2. Parser extracts intent: search topic, category filter, mode detection (Hunter/Curator/Learner)
3. Query understanding identifies key entities: industries, topics, author types, content types
4. Parser converts natural language to structured query parameters: semantic_query, category_filter, source_filter
5. Handles various query formats: questions, commands, topic keywords
6. Default behavior when mode is ambiguous: return all relevant results without mode-specific formatting
7. Query parsing completes in <100ms
8. Manual test: Parsing 20 diverse queries correctly extracts topics and filters

### Story 3.3: Semantic Search & Hybrid Retrieval

As a **developer**,
I want **hybrid search combining semantic similarity and structured filters**,
so that **query results are both semantically relevant and respect user-specified constraints**.

#### Acceptance Criteria

1. Search function accepts query parameters: semantic_query_text, category_filter, source_filter, limit
2. Semantic search queries vector database for top-k similar embeddings
3. Structured filters apply category, source, date range constraints to semantic results
4. Hybrid scoring combines semantic similarity (0-1) with metadata relevance boosts
5. Relevance boosting: exact author match +0.2, recent bookmarks +0.1, high enrichment confidence +0.1
6. Results sorted by final hybrid score in descending order
7. Search returns bookmark IDs with scores, then hydrates full bookmark + metadata from SQLite
8. Query response time <2 seconds for 500 bookmarks (FR10 requirement)
9. Manual test: Querying "Next.js tutorials" returns relevant tutorial bookmarks ranked by relevance

### Story 3.4: Hunter Mode Query Processing

As a **user**,
I want **Hunter mode queries to return enriched profiles optimized for prospecting**,
so that **I can quickly gather context for outreach without manual research**.

#### Acceptance Criteria

1. Hunter mode detection triggers when query mentions: industries, companies, leads, prospects, outreach, agencies, clients
2. Hunter mode response format emphasizes: author bio, company/affiliation, intent (why bookmarked), suggested outreach angles
3. Results include "Hunter Insights" generated from enriched metadata: connection opportunities, relevant context for outreach, shared interests
4. Outreach angle suggestions generated via LLM using enriched context (1-2 sentence conversation starters)
5. Results grouped by author when multiple bookmarks from same person exist
6. Hunter mode API response includes structured fields: author, company, contact_url, enriched_context, outreach_suggestions
7. Response time <3 seconds including LLM outreach generation
8. Manual test: Query "show me design agencies I've bookmarked" returns profiles with actionable outreach context

### Story 3.5: Query Results API & Response Formatting

As a **developer**,
I want **standardized API endpoints for query execution with consistent response formats**,
so that **frontend UI can reliably consume and display query results**.

#### Acceptance Criteria

1. API endpoint `/api/query` accepts POST with body: { query: string, filters: {...}, limit: number }
2. Response format includes: query_metadata (detected_mode, category_filter, execution_time), results array, total_count
3. Each result object contains: bookmark (full data), metadata (enrichment data), relevance_score, connections (related bookmarks)
4. Error handling returns structured errors: invalid query, no results found, database unavailable
5. Response pagination supports offset/limit for large result sets
6. Query execution logs: query_text, detected_mode, result_count, execution_time_ms
7. API validates inputs and sanitizes query text to prevent injection attacks
8. Manual test: Executing 10 varied queries returns properly formatted JSON responses with all required fields

### Story 3.6: Query Performance Optimization & Caching

As a **developer**,
I want **query performance optimizations to meet <2s response time requirement**,
so that **the system remains responsive even with 500+ bookmarks**.

#### Acceptance Criteria

1. Database indexes created on frequently queried fields: category, source, created_at, author
2. Vector search results limited to top-50 candidates before hybrid scoring to reduce computation
3. Query result caching for repeated identical queries (5-minute TTL)
4. Embedding generation parallelized during batch processing to reduce total time
5. Database connection pooling prevents connection overhead on each query
6. Performance monitoring logs slow queries (>2s) with execution plan details
7. Load testing validates <2s response time for 500 bookmarks across 20 concurrent queries
8. Manual test: Executing same query twice shows cache hit on second execution with <500ms response

---

## Epic 4: Dashboard & User Interface

**Epic Goal:** Create a hybrid dashboard-chat interface with visual pattern displays, query input, bookmark detail views, and enrichment controls that deliver the complete user experience. By the end of this epic, the MVP is feature-complete and ready for daily use validation.

### Story 4.1: Main Dashboard Layout & Navigation

As a **user**,
I want **a clean dashboard showing bookmark overview and quick access to key functions**,
so that **I have situational awareness and can navigate the system efficiently**.

#### Acceptance Criteria

1. Dashboard displays category breakdown widget showing bookmark counts: Inspo, Leads/Markets, Tutorials
2. Recent activity feed shows last 10 synced or enriched bookmarks with timestamps
3. Prominent query input field always visible at top of dashboard
4. Manual sync controls for Twitter and LinkedIn with individual trigger buttons
5. Navigation to Settings, Sync Status, Enrichment Metrics accessible from header/sidebar
6. Dashboard is responsive and functional on desktop (optimized) and tablet/mobile (acceptable)
7. Initial page load time <3 seconds on localhost
8. Manual test: Dashboard accurately reflects current bookmark state after sync/enrichment operations

### Story 4.2: Query Interface & Results Display

As a **user**,
I want **to enter queries and see results with enriched context**,
so that **I can find bookmarks using natural language and understand why they match**.

#### Acceptance Criteria

1. Query input field accepts natural language text with submit button and Enter key support
2. Query execution shows loading state with progress indicator
3. Results display as cards showing: bookmark content preview, author, category badge, relevance score, intent summary
4. Hunter mode results use specialized card format: author bio, company, outreach suggestions prominently displayed
5. No results state shows helpful message suggesting query refinement
6. Results are clickable to open Bookmark Detail View (Story 4.3)
7. Query history (last 5 queries) accessible via dropdown for quick re-execution
8. Manual test: Executing queries from dashboard returns formatted results in <2 seconds

### Story 4.3: Bookmark Detail View & Metadata Display

As a **user**,
I want **detailed view of individual bookmarks with all enriched metadata**,
so that **I can review AI-generated context and manually override categories if needed**.

#### Acceptance Criteria

1. Detail view shows: original bookmark content, source platform badge, author info, bookmarked date
2. Enrichment section displays: AI-generated intent, extracted context, assigned category with confidence score
3. Category override dropdown allows manual reassignment to different category
4. Connections section lists related bookmarks with connection strength indicators
5. Link to original bookmark URL opens in new tab
6. Detail view accessible from query results and dashboard recent activity
7. Changes to category persist immediately to database
8. Manual test: Opening bookmark details, overriding category, and verifying database update

### Story 4.4: Sync Progress Modal & Status Tracking

As a **user**,
I want **visibility into sync progress with clear status updates**,
so that **I understand what's happening during MCP bookmark fetching**.

#### Acceptance Criteria

1. Clicking sync button opens modal overlay showing progress
2. Progress display shows: platform (Twitter/LinkedIn), bookmarks fetched count, estimated remaining time
3. Real-time updates via polling `/api/sync/status` endpoint every 2 seconds
4. Completion state shows summary: total fetched, new bookmarks added, duplicates skipped, errors
5. Error handling displays user-friendly messages for rate limits, network failures, MCP unavailability
6. Modal dismissible after completion, auto-dismisses after 3 seconds
7. Background sync continues if user dismisses modal during progress
8. Manual test: Syncing 50+ bookmarks shows accurate real-time progress updates

### Story 4.5: Enrichment Queue & Batch Controls

As a **user**,
I want **to trigger batch enrichment with cost estimates and progress visibility**,
so that **I can process bookmarks while staying informed about costs and timing**.

#### Acceptance Criteria

1. Enrichment trigger button accessible from dashboard or Settings
2. Pre-enrichment modal shows: bookmark count to process, estimated time (5-15 min for 100), estimated cost
3. User confirms or cancels before enrichment starts
4. Progress view shows: current bookmark being processed, completed count, current enrichment step (intent/context/category)
5. Real-time cost tracking displays cumulative spend during batch
6. Pause/resume controls allow stopping enrichment mid-batch
7. Completion summary shows: total enriched, total cost, average cost per bookmark, quality metrics
8. Manual test: Enriching 20+ bookmarks displays accurate progress and cost tracking

### Story 4.6: Settings & Configuration Screen

As a **user**,
I want **a settings screen for API key management and system configuration**,
so that **I can manage credentials and view enrichment history**.

#### Acceptance Criteria

1. Settings screen displays current API key status (configured/missing) without exposing keys
2. Form inputs for updating API keys: OpenAI, Anthropic, MCP credentials
3. Model selection dropdowns for intent, context, categorization tasks
4. Cost tracking dashboard showing: total spend, spend by model, cost per bookmark average
5. Enrichment history table: date, bookmarks processed, cost, quality score
6. Sync history table: date, source, bookmarks fetched, errors
7. Settings changes persist to environment or configuration file
8. Manual test: Updating API key in settings reflects in subsequent enrichment operations

### Story 4.7: Mobile Responsive Layout & Polish

As a **developer**,
I want **mobile-responsive layouts and UI polish for production readiness**,
so that **the MVP feels complete and functional across devices**.

#### Acceptance Criteria

1. Dashboard, query interface, and detail views render correctly on mobile (375px width minimum)
2. Touch-friendly button sizes and spacing on mobile devices
3. Category badge colors and icons consistent across all views
4. Loading states and error messages styled consistently
5. Accessibility: keyboard navigation works, sufficient color contrast (WCAG AA), screen reader friendly headings
6. Empty states designed for: no bookmarks synced, no enrichment completed, no query results
7. Favicon and page title set appropriately
8. Manual test: Using application on mobile device completes core workflows (sync, enrich, query)

---

## Checklist Results Report

### Executive Summary

**Overall PRD Completeness:** 92%
**MVP Scope Appropriateness:** Just Right
**Readiness for Architecture Phase:** Ready
**Most Critical Concerns:** None blocking; minor enhancements would improve clarity around error handling patterns and post-MVP roadmap prioritization.

### Category Analysis

| Category                         | Status  | Critical Issues |
| -------------------------------- | ------- | --------------- |
| 1. Problem Definition & Context  | PASS    | None            |
| 2. MVP Scope Definition          | PASS    | None            |
| 3. User Experience Requirements  | PASS    | None            |
| 4. Functional Requirements       | PASS    | None            |
| 5. Non-Functional Requirements   | PASS    | None            |
| 6. Epic & Story Structure        | PASS    | None            |
| 7. Technical Guidance            | PASS    | None            |
| 8. Cross-Functional Requirements | PARTIAL | Minor: Integration testing approach could be more explicit |
| 9. Clarity & Communication       | PASS    | None            |

### Top Issues by Priority

**BLOCKERS:** None

**HIGH:** None

**MEDIUM:**
- Integration testing strategy for MCP connectors could be more detailed (mocking approach, fixture data structure)
- Post-MVP roadmap prioritization (Eagle integration timing, Curator/Learner mode sequencing)

**LOW:**
- Could add explicit user journey diagrams for visual clarity (supplement text-based flow descriptions)
- Settings screen story (4.6) could specify configuration persistence mechanism more explicitly

### MVP Scope Assessment

**Scope is Appropriately Minimal:**
✅ Core features directly address problem statement (scattered bookmarks → unified intelligence)
✅ Clear differentiation between MVP (Hunter mode focus) and Phase 2 (Curator/Learner enhancements)
✅ Manual sync approach appropriately trades automation for cost control and user agency
✅ Local-first architecture minimizes complexity and hosting overhead

**No Features Recommended for Cutting:**
- All 4 epics deliver incremental, testable value
- Each epic enables validation of core hypotheses (Epic 1: data ingestion works, Epic 2: enrichment quality/cost, Epic 3: query-driven paradigm, Epic 4: full user experience)

**No Missing Essential Features Identified:**
- Brief's MVP success criteria fully covered by epic stories
- Hunter mode (highest ROI use case) properly emphasized
- Cost tracking and quality monitoring built into Epic 2

**Complexity Appropriate for Timeline:**
- 6-8 week timeline realistic for 26 stories across 4 epics
- Solo developer at 10-15 hrs/week = ~60-120 hours total
- Average story size 2-4 hours fits AI agent execution model

### Technical Readiness

**Technical Constraints are Clear:**
✅ Monorepo structure specified
✅ Framework preferences documented (Next.js lean, SvelteKit acceptable)
✅ Multi-model LLM routing for cost optimization defined
✅ Vector database choice (Chroma local preferred) specified
✅ Local-first architecture with cloud migration path documented

**Identified Technical Risks Adequately Addressed:**
✅ MCP reliability risk → error handling in Stories 1.3, 1.4, NFR12
✅ Enrichment quality risk → quality tracking in Story 2.7, manual validation in acceptance criteria
✅ Cost escalation risk → model routing in Story 2.1, cost tracking throughout Epic 2
✅ Performance risk → explicit <2s query requirement in FR10, optimization story 3.6

**Areas Flagged for Architect Investigation:**
- Eagle integration preparation (Story 2.x assumption about enrichment service abstraction)
- Migration tooling selection (Prisma vs. Drizzle vs. Alembic)
- Vector database performance validation at 500 bookmark scale
- LangChain inclusion/exclusion decision based on connection detection complexity

### Recommendations

**RECOMMENDED ACTIONS (Before Architect Handoff):**

1. **Add Integration Testing Guidance** (Medium Priority)
   - In Story 1.3/1.4: Specify fixture data structure for mocked MCP responses
   - Clarify whether integration tests run against live MCP endpoints or always use mocks

2. **Clarify Post-MVP Prioritization** (Low Priority)
   - Brief mentions Phase 2 features (Eagle, Curator mode, Learner 30-day challenges)
   - Add brief prioritization guidance: which features come first based on MVP learnings?

3. **Document Error Recovery Patterns** (Low Priority)
   - Stories mention error handling, but could add cross-cutting pattern: retry with backoff, fail gracefully, user notification
   - Recommend adding to Epic 1 README or architecture decision record

**OPTIONAL ENHANCEMENTS (Not Blocking):**

- Add user journey diagram for Hunter mode workflow (Brief → Sync → Enrich → Query → Outreach)
- Specify configuration persistence in Story 4.6 (environment variables vs. config file vs. database)
- Add explicit "Definition of Done" checklist for stories (tests pass, docs updated, etc.)

### Final Decision

**✅ READY FOR ARCHITECT**

The PRD and epics are comprehensive, properly structured, and ready for architectural design. The product vision is clear, MVP scope is appropriately minimal, and technical constraints provide sufficient guidance without over-specifying implementation details. Epic sequencing follows agile best practices, and story acceptance criteria are testable and sized for AI agent execution.

**Key Strengths:**
1. Tight alignment between Project Brief, PRD goals, and epic stories
2. Clear cost optimization strategy (model routing, manual sync, local-first)
3. Quality validation built into workflow (enrichment metrics, query success rate)
4. Appropriate technical flexibility (framework choice, LLM provider options)
5. Hunter mode emphasis matches "highest ROI use case" from Brief

**Recommended Next Steps:**
1. Address medium-priority integration testing clarification
2. Hand off to UX Expert for design mockups (especially Hunter mode card layout)
3. Hand off to Architect for technical design and stack finalization
4. Begin Epic 1 implementation once architecture approved

---

## Next Steps

### UX Expert Prompt

I've completed the Product Requirements Document for the Unified Bookmark Intelligence System. The PRD includes detailed functional and non-functional requirements, UI design goals, and four epics with 26 user stories.

**Key UX Design Needs:**
- Hybrid dashboard-chat interface balancing visual pattern discovery with conversational query
- Hunter mode result cards optimized for prospecting (author bio, company, outreach suggestions prominently displayed)
- Sync and enrichment progress modals with real-time updates and cost transparency
- Category badge system (💡 Inspo, 🎯 Leads/Markets, 📚 Tutorials) for quick visual scanning
- Desktop-first responsive design (WCAG AA compliance)

Please review the PRD at [docs/prd.md](docs/prd.md) and create design mockups focusing on:
1. Main dashboard layout with category widgets and query input
2. Hunter mode query results display
3. Bookmark detail view with enrichment metadata
4. Sync/enrichment progress modals

### Architect Prompt

I've completed the Product Requirements Document for the Unified Bookmark Intelligence System. The PRD includes comprehensive technical assumptions, 26 user stories across 4 epics, and detailed acceptance criteria.

**Key Architecture Decisions Needed:**
- Framework selection (Next.js vs. SvelteKit) with rationale
- Database schema design for bookmarks, metadata, and connections
- Multi-model LLM routing implementation approach
- Vector database setup (Chroma local vs. Pinecone free tier)
- MCP integration patterns for Twitter and LinkedIn connectors
- Enrichment service abstraction to support future Eagle integration

Please review the PRD at [docs/prd.md](docs/prd.md) and create the architecture document addressing:
1. Technical stack selection with trade-off analysis
2. Database schema and migration strategy
3. Service layer architecture (MCP, Enrichment, Query, UI)
4. Cost optimization approach for LLM API usage
5. Performance optimization strategy for <2s query requirement

---

*PRD created using the BMAD-METHOD™ framework with Product Manager John*
