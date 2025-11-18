/**
 * LLM cost tracking and estimation utilities
 */

import type { LLMProvider, TokenUsage } from './types';

/**
 * Pricing per 1M tokens (as of 2025)
 * Prices in USD
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI pricing
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },

  // Anthropic pricing
  'claude-sonnet-4': { input: 3.00, output: 15.00 },
  'claude-sonnet-3.5': { input: 3.00, output: 15.00 },
  'claude-haiku-3.5': { input: 0.80, output: 4.00 },
  'claude-opus-3': { input: 15.00, output: 75.00 },

  // Embedding models
  'text-embedding-3-small': { input: 0.02, output: 0.02 },
  'text-embedding-3-large': { input: 0.13, output: 0.13 },
  'text-embedding-ada-002': { input: 0.10, output: 0.10 },
};

/**
 * Calculate cost for a given model and token usage
 */
export function calculateCost(
  model: string,
  usage: TokenUsage
): number {
  const pricing = MODEL_PRICING[model];

  if (!pricing) {
    console.warn(`⚠️  Unknown model pricing for: ${model}. Using default estimate.`);
    // Default fallback pricing (average mid-tier model)
    return ((usage.prompt_tokens * 1.0) + (usage.completion_tokens * 3.0)) / 1_000_000;
  }

  const inputCost = (usage.prompt_tokens * pricing.input) / 1_000_000;
  const outputCost = (usage.completion_tokens * pricing.output) / 1_000_000;

  return inputCost + outputCost;
}

/**
 * Estimate tokens for a given text
 * Rough approximation: ~4 characters per token
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Estimate cost for enriching a bookmark
 */
export function estimateEnrichmentCost(
  contentLength: number,
  tasks: string[],
  categoryModel: string = 'gpt-4o-mini',
  intentModel: string = 'gpt-4o'
): number {
  let totalCost = 0;

  // Base prompt overhead (system prompt + instructions)
  const basePromptTokens = 200;
  const contentTokens = estimateTokens(contentLength.toString());

  for (const task of tasks) {
    if (task === 'category') {
      // Category assignment: cheap model, short output (~50 tokens)
      const inputTokens = basePromptTokens + contentTokens;
      const outputTokens = 50;
      totalCost += calculateCost(categoryModel, {
        prompt_tokens: inputTokens,
        completion_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
      });
    } else if (task === 'intent' || task === 'context') {
      // Intent/context: expensive model, longer output (~150 tokens)
      const inputTokens = basePromptTokens + contentTokens;
      const outputTokens = 150;
      totalCost += calculateCost(intentModel, {
        prompt_tokens: inputTokens,
        completion_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
      });
    }
  }

  return totalCost;
}

/**
 * Format cost as currency string
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  return `$${cost.toFixed(2)}`;
}

/**
 * Get model pricing information
 */
export function getModelPricing(model: string): { input: number; output: number } | null {
  return MODEL_PRICING[model] || null;
}

/**
 * Normalize model name for pricing lookup
 */
export function normalizeModelName(model: string): string {
  // Handle version suffixes (e.g., gpt-4o-2024-08-06 -> gpt-4o)
  const baseModel = model.split('-').slice(0, -1).join('-');
  if (MODEL_PRICING[baseModel]) {
    return baseModel;
  }

  // Handle Anthropic model variations
  if (model.includes('sonnet')) {
    if (model.includes('3.5') || model.includes('3-5')) return 'claude-sonnet-3.5';
    return 'claude-sonnet-4';
  }
  if (model.includes('haiku')) return 'claude-haiku-3.5';
  if (model.includes('opus')) return 'claude-opus-3';

  // Handle OpenAI model variations
  if (model.includes('gpt-4o-mini')) return 'gpt-4o-mini';
  if (model.includes('gpt-4o')) return 'gpt-4o';
  if (model.includes('gpt-4-turbo')) return 'gpt-4-turbo';
  if (model.includes('gpt-3.5-turbo')) return 'gpt-3.5-turbo';

  return model;
}

/**
 * Cost tracker class for accumulating costs across multiple operations
 */
export class CostTracker {
  private totalCost = 0;
  private totalTokens = 0;
  private callCount = 0;
  private costByModel: Map<string, number> = new Map();
  private tokensByModel: Map<string, number> = new Map();

  /**
   * Record an LLM API call
   */
  record(model: string, usage: TokenUsage, cost: number): void {
    this.totalCost += cost;
    this.totalTokens += usage.total_tokens;
    this.callCount += 1;

    const currentModelCost = this.costByModel.get(model) || 0;
    this.costByModel.set(model, currentModelCost + cost);

    const currentModelTokens = this.tokensByModel.get(model) || 0;
    this.tokensByModel.set(model, currentModelTokens + usage.total_tokens);
  }

  /**
   * Get total cost accumulated
   */
  getTotalCost(): number {
    return this.totalCost;
  }

  /**
   * Get total tokens used
   */
  getTotalTokens(): number {
    return this.totalTokens;
  }

  /**
   * Get number of API calls made
   */
  getCallCount(): number {
    return this.callCount;
  }

  /**
   * Get cost breakdown by model
   */
  getCostByModel(): Record<string, number> {
    return Object.fromEntries(this.costByModel);
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    total_cost: number;
    total_tokens: number;
    call_count: number;
    average_cost_per_call: number;
    cost_by_model: Record<string, number>;
    tokens_by_model: Record<string, number>;
  } {
    return {
      total_cost: this.totalCost,
      total_tokens: this.totalTokens,
      call_count: this.callCount,
      average_cost_per_call: this.callCount > 0 ? this.totalCost / this.callCount : 0,
      cost_by_model: Object.fromEntries(this.costByModel),
      tokens_by_model: Object.fromEntries(this.tokensByModel),
    };
  }

  /**
   * Reset the tracker
   */
  reset(): void {
    this.totalCost = 0;
    this.totalTokens = 0;
    this.callCount = 0;
    this.costByModel.clear();
    this.tokensByModel.clear();
  }
}
