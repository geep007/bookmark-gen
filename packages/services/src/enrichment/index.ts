/**
 * Enrichment service exports
 */

// LLM Client
export { getLLMClient, LLMClient } from './llm-client';

// Cost tracking
export {
  calculateCost,
  estimateTokens,
  estimateEnrichmentCost,
  formatCost,
  getModelPricing,
  normalizeModelName,
  CostTracker,
} from './cost-tracker';

// Intent generation
export {
  generateIntent,
  generateIntentBatch,
  estimateIntentCost,
} from './intent';

// Context extraction
export {
  generateContext,
  generateContextBatch,
  estimateContextCost,
} from './context';

// Category assignment
export {
  assignCategory,
  assignCategoryBatch,
  estimateCategoryCost,
  getCategoryDistribution,
  getLowConfidenceBookmarks,
} from './category';

// Connection detection
export {
  detectConnections,
  getConnectionSummary,
  filterByStrength,
  getBookmarkConnections,
  type Connection,
  type ConnectionType,
  type EnrichedBookmarkData,
} from './connections';

// Batch enrichment pipeline
export {
  enrichBookmarkBatch,
  estimateBatchEnrichmentCost,
  type EnrichmentOptions,
  type BatchEnrichmentResult,
} from './pipeline';

// Types
export type {
  LLMProvider,
  EnrichmentTask,
  ModelConfig,
  TokenUsage,
  LLMResult,
  IntentResult,
  ContextResult,
  CategoryResult,
  OutreachResult,
  BookmarkEnrichment,
  EnrichmentJob,
  CostEstimate,
} from './types';
