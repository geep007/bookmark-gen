/**
 * Enrichment service types
 */

import type { Bookmark, CategoryType } from '@bookmark-gen/shared';

/**
 * LLM API providers
 */
export type LLMProvider = 'openai' | 'anthropic';

/**
 * LLM task types for routing
 */
export type EnrichmentTask = 'intent' | 'context' | 'category' | 'outreach';

/**
 * Model configuration for routing
 */
export interface ModelConfig {
  provider: LLMProvider;
  model: string;
  max_tokens: number;
  temperature: number;
}

/**
 * Token usage tracking
 */
export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/**
 * LLM API call result
 */
export interface LLMResult<T = unknown> {
  data: T;
  usage: TokenUsage;
  model: string;
  provider: LLMProvider;
  cost: number;
}

/**
 * Intent enrichment result
 */
export interface IntentResult {
  intent: string;
  confidence: number;
}

/**
 * Context enrichment result
 */
export interface ContextResult {
  author_bio?: string;
  company?: string;
  primary_topic: string;
  key_themes: string[];
}

/**
 * Category assignment result
 */
export interface CategoryResult {
  category: CategoryType;
  confidence: number;
  reasoning?: string;
}

/**
 * Outreach suggestion result (for Hunter mode)
 */
export interface OutreachResult {
  suggestions: string[];
  context: string;
}

/**
 * Complete enrichment result for a bookmark
 */
export interface BookmarkEnrichment {
  bookmark_id: string;
  intent?: string;
  author_bio?: string;
  company?: string;
  primary_topic?: string;
  key_themes?: string[];
  category?: CategoryType;
  category_confidence?: number;
  total_cost: number;
  total_tokens: number;
  enrichment_version: string;
}

/**
 * Enrichment job for batch processing
 */
export interface EnrichmentJob {
  bookmark: Bookmark;
  tasks: EnrichmentTask[];
}

/**
 * Cost estimation for enrichment
 */
export interface CostEstimate {
  estimated_tokens: number;
  estimated_cost: number;
  breakdown: Array<{
    task: EnrichmentTask;
    tokens: number;
    cost: number;
  }>;
}
