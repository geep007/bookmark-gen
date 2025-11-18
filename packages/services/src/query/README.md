# Query Service

This directory will contain the semantic search and query processing services.

## Planned Implementation

### Vector Database Integration
- Chroma (local) or Pinecone setup
- Embedding generation (OpenAI text-embedding-3-small)
- Vector storage and retrieval
- Similarity search

### Query Parser
- Natural language query parsing
- Intent detection (Hunter/Curator/Learner mode)
- Entity extraction (topics, industries, authors)
- Structured query parameters

### Hybrid Search
- Semantic similarity search (vector DB)
- Structured filtering (SQLite)
- Relevance scoring and ranking
- Result hydration

### Hunter Mode
- Profile-optimized result formatting
- Outreach angle generation
- Author grouping
- Contact context

## Epic 3

These services implement the requirements from:
- Story 3.1: Vector Database Setup & Embedding Generation
- Story 3.2: Natural Language Query Parser
- Story 3.3: Semantic Search & Hybrid Retrieval
- Story 3.4: Hunter Mode Query Processing
- Story 3.5: Query Results API & Response Formatting
- Story 3.6: Query Performance Optimization & Caching

## Status

⏳ **To be implemented** - Placeholder for Epic 3 development
