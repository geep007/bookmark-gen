# Enrichment Service

This directory will contain the LLM enrichment pipeline services.

## Planned Implementation

### Multi-Model LLM Client
- Support for OpenAI and Anthropic APIs
- Model routing logic (cheap models for categorization, expensive for generation)
- Token usage tracking and cost calculation
- Retry logic with exponential backoff

### Intent Generation
- AI-generated intent/reason for why bookmark was saved
- Prompt engineering for concise, accurate intent statements

### Context Extraction
- Author bio extraction
- Company/affiliation identification
- Topic and theme extraction
- Structured metadata output

### Category Assignment
- Auto-categorization into Inspo, Leads/Markets, Tutorials
- Confidence score calculation
- Low-confidence flagging for review

### Connection Detection
- Identify relationships between bookmarks
- Shared author, topic, semantic similarity
- Connection strength scoring

## Epic 2

These services implement the requirements from:
- Story 2.1: LLM Client Configuration & Model Routing
- Story 2.2: Intent & Reason Enrichment
- Story 2.3: Context Extraction & Author Analysis
- Story 2.4: Category Assignment & Classification
- Story 2.5: Connection Detection Between Bookmarks
- Story 2.6: Batch Enrichment Pipeline & Progress Tracking

## Status

⏳ **To be implemented** - Placeholder for Epic 2 development
