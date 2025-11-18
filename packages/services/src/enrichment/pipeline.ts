/**
 * Batch Enrichment Pipeline & Progress Tracking
 * Orchestrates the complete enrichment workflow
 */

import type { Bookmark, EnrichmentProgress } from '@bookmark-gen/shared';
import { getBookmarkRepository, getMetadataRepository, getConnectionRepository, getEnrichmentLogRepository } from '@bookmark-gen/database';
import { generateIntent, estimateIntentCost } from './intent';
import { generateContext, estimateContextCost } from './context';
import { assignCategory, estimateCategoryCost, getCategoryDistribution } from './category';
import { detectConnections, getConnectionSummary, type EnrichedBookmarkData } from './connections';
import { CostTracker } from './cost-tracker';
import type { IntentResult, ContextResult, CategoryResult } from './types';
import { randomUUID } from 'crypto';

/**
 * Enrichment result for a single bookmark
 */
interface BookmarkEnrichmentResult {
  bookmark_id: string;
  intent?: IntentResult;
  context?: ContextResult;
  category?: CategoryResult;
  total_cost: number;
  total_tokens: number;
  error?: string;
}

/**
 * Batch enrichment options
 */
export interface EnrichmentOptions {
  skipIntent?: boolean;
  skipContext?: boolean;
  skipCategory?: boolean;
  skipConnections?: boolean;
  onProgress?: (progress: EnrichmentProgress) => void;
}

/**
 * Batch enrichment result
 */
export interface BatchEnrichmentResult {
  total_bookmarks: number;
  successful: number;
  failed: number;
  total_cost: number;
  total_tokens: number;
  execution_time_ms: number;
  category_distribution: Record<string, number>;
  connections_detected: number;
  errors: Array<{ bookmark_id: string; error: string }>;
}

/**
 * Current enrichment version
 */
const ENRICHMENT_VERSION = '1.0';

/**
 * Enrich a batch of bookmarks
 */
export async function enrichBookmarkBatch(
  bookmarkIds?: string[],
  options: EnrichmentOptions = {}
): Promise<BatchEnrichmentResult> {
  const startTime = Date.now();
  const costTracker = new CostTracker();

  const bookmarkRepo = getBookmarkRepository();
  const metadataRepo = getMetadataRepository();
  const connectionRepo = getConnectionRepository();
  const enrichmentLogRepo = getEnrichmentLogRepository();

  // Fetch bookmarks to enrich
  let bookmarks: Bookmark[];
  if (bookmarkIds && bookmarkIds.length > 0) {
    bookmarks = bookmarkIds
      .map(id => bookmarkRepo.findById(id))
      .filter((b): b is Bookmark => b !== null);
  } else {
    // Get all unenriched bookmarks
    bookmarks = bookmarkRepo.findUnenriched();
  }

  if (bookmarks.length === 0) {
    return {
      total_bookmarks: 0,
      successful: 0,
      failed: 0,
      total_cost: 0,
      total_tokens: 0,
      execution_time_ms: Date.now() - startTime,
      category_distribution: {},
      connections_detected: 0,
      errors: [],
    };
  }

  const results: BookmarkEnrichmentResult[] = [];
  const errors: Array<{ bookmark_id: string; error: string }> = [];

  console.log(`📝 Starting enrichment for ${bookmarks.length} bookmarks...`);

  // Step 1: Generate intents
  if (!options.skipIntent) {
    console.log('🎯 Step 1/4: Generating intents...');
    reportProgress(options.onProgress, bookmarks.length, 0, 'intent', 0, 0);

    for (let i = 0; i < bookmarks.length; i++) {
      const bookmark = bookmarks[i];

      try {
        const result = await generateIntent(bookmark);
        costTracker.record(result.model, result.usage, result.cost);

        const existing = results.find(r => r.bookmark_id === bookmark.id);
        if (existing) {
          existing.intent = result.data;
          existing.total_cost += result.cost;
          existing.total_tokens += result.usage.total_tokens;
        } else {
          results.push({
            bookmark_id: bookmark.id,
            intent: result.data,
            total_cost: result.cost,
            total_tokens: result.usage.total_tokens,
          });
        }

        reportProgress(options.onProgress, bookmarks.length, i + 1, 'intent', costTracker.getTotalCost(), 0);
      } catch (error) {
        console.error(`❌ Failed to generate intent for ${bookmark.id}:`, error);
        errors.push({ bookmark_id: bookmark.id, error: (error as Error).message });
      }

      // Small delay to avoid rate limits
      if (i < bookmarks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  }

  // Step 2: Extract context
  if (!options.skipContext) {
    console.log('🔍 Step 2/4: Extracting context...');
    reportProgress(options.onProgress, bookmarks.length, 0, 'context', costTracker.getTotalCost(), 0);

    for (let i = 0; i < bookmarks.length; i++) {
      const bookmark = bookmarks[i];

      try {
        const result = await generateContext(bookmark);
        costTracker.record(result.model, result.usage, result.cost);

        const existing = results.find(r => r.bookmark_id === bookmark.id);
        if (existing) {
          existing.context = result.data;
          existing.total_cost += result.cost;
          existing.total_tokens += result.usage.total_tokens;
        } else {
          results.push({
            bookmark_id: bookmark.id,
            context: result.data,
            total_cost: result.cost,
            total_tokens: result.usage.total_tokens,
          });
        }

        reportProgress(options.onProgress, bookmarks.length, i + 1, 'context', costTracker.getTotalCost(), 0);
      } catch (error) {
        console.error(`❌ Failed to generate context for ${bookmark.id}:`, error);
        errors.push({ bookmark_id: bookmark.id, error: (error as Error).message });
      }

      // Small delay to avoid rate limits
      if (i < bookmarks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  }

  // Step 3: Assign categories
  if (!options.skipCategory) {
    console.log('🏷️  Step 3/4: Assigning categories...');
    reportProgress(options.onProgress, bookmarks.length, 0, 'category', costTracker.getTotalCost(), 0);

    for (let i = 0; i < bookmarks.length; i++) {
      const bookmark = bookmarks[i];
      const enrichmentData = results.find(r => r.bookmark_id === bookmark.id);

      try {
        const result = await assignCategory(
          bookmark,
          enrichmentData?.intent,
          enrichmentData?.context
        );
        costTracker.record(result.model, result.usage, result.cost);

        const existing = results.find(r => r.bookmark_id === bookmark.id);
        if (existing) {
          existing.category = result.data;
          existing.total_cost += result.cost;
          existing.total_tokens += result.usage.total_tokens;
        } else {
          results.push({
            bookmark_id: bookmark.id,
            category: result.data,
            total_cost: result.cost,
            total_tokens: result.usage.total_tokens,
          });
        }

        reportProgress(options.onProgress, bookmarks.length, i + 1, 'category', costTracker.getTotalCost(), 0);
      } catch (error) {
        console.error(`❌ Failed to assign category for ${bookmark.id}:`, error);
        errors.push({ bookmark_id: bookmark.id, error: (error as Error).message });
      }

      // Small delay to avoid rate limits
      if (i < bookmarks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  // Step 4: Detect connections
  let connectionsDetected = 0;
  if (!options.skipConnections) {
    console.log('🔗 Step 4/4: Detecting connections...');
    reportProgress(options.onProgress, bookmarks.length, 0, 'connections', costTracker.getTotalCost(), 0);

    const enrichedData: EnrichedBookmarkData[] = bookmarks.map(bookmark => {
      const result = results.find(r => r.bookmark_id === bookmark.id);
      return {
        bookmark,
        metadata: result ? {
          primary_topic: result.context?.primary_topic,
          key_themes: result.context?.key_themes,
          category: result.category?.category,
        } : undefined,
      };
    });

    const connections = detectConnections(enrichedData);
    connectionsDetected = connections.length;

    // Save connections to database
    for (const connection of connections) {
      connectionRepo.create({
        bookmark_id_1: connection.bookmark_id_1,
        bookmark_id_2: connection.bookmark_id_2,
        connection_type: connection.connection_type,
        strength_score: connection.strength_score,
      });
    }

    const summary = getConnectionSummary(connections);
    console.log(`✅ Detected ${connectionsDetected} connections (avg ${summary.avg_connections_per_bookmark.toFixed(2)} per bookmark)`);
  }

  // Save enrichment results to database
  console.log('💾 Saving enrichment results...');
  let successful = 0;

  for (const result of results) {
    if (result.error) continue;

    try {
      // Update bookmark enrichment version
      bookmarkRepo.updateEnrichmentVersion(result.bookmark_id, ENRICHMENT_VERSION);

      // Create or update metadata using upsert
      metadataRepo.upsert({
        bookmark_id: result.bookmark_id,
        intent: result.intent?.intent,
        author_bio: result.context?.author_bio,
        company: result.context?.company,
        primary_topic: result.context?.primary_topic,
        key_themes: result.context?.key_themes,
        category: result.category?.category,
        category_confidence: result.category?.confidence,
        enrichment_quality_score: null,
      });

      successful++;
    } catch (error) {
      console.error(`❌ Failed to save enrichment for ${result.bookmark_id}:`, error);
      errors.push({ bookmark_id: result.bookmark_id, error: (error as Error).message });
    }
  }

  // Log enrichment batch
  const summary = costTracker.getSummary();
  enrichmentLogRepo.create({
    bookmarks_processed: successful,
    tokens_used: summary.total_tokens,
    cost: summary.total_cost,
    model_used: 'multi-model',
    enrichment_type: 'intent',
  });

  const categoryDist = getCategoryDistribution(
    results.filter(r => r.category).map(r => ({ result: { data: r.category! } as any }))
  );

  const executionTime = Date.now() - startTime;

  console.log(`✅ Enrichment complete!`);
  console.log(`   - Processed: ${successful}/${bookmarks.length} bookmarks`);
  console.log(`   - Cost: $${summary.total_cost.toFixed(4)}`);
  console.log(`   - Tokens: ${summary.total_tokens.toLocaleString()}`);
  console.log(`   - Time: ${(executionTime / 1000).toFixed(1)}s`);

  return {
    total_bookmarks: bookmarks.length,
    successful,
    failed: bookmarks.length - successful,
    total_cost: summary.total_cost,
    total_tokens: summary.total_tokens,
    execution_time_ms: executionTime,
    category_distribution: categoryDist,
    connections_detected: connectionsDetected,
    errors,
  };
}

/**
 * Estimate cost for enriching bookmarks
 */
export function estimateBatchEnrichmentCost(bookmarkIds?: string[]): {
  estimated_cost: number;
  estimated_tokens: number;
  bookmarks_count: number;
} {
  const bookmarkRepo = getBookmarkRepository();

  let bookmarks: Bookmark[];
  if (bookmarkIds && bookmarkIds.length > 0) {
    bookmarks = bookmarkIds
      .map(id => bookmarkRepo.findById(id))
      .filter((b): b is Bookmark => b !== null);
  } else {
    bookmarks = bookmarkRepo.findUnenriched();
  }

  const intentCost = estimateIntentCost(bookmarks);
  const contextCost = estimateContextCost(bookmarks);
  const categoryCost = estimateCategoryCost(bookmarks);

  const totalCost = intentCost + contextCost + categoryCost;

  // Rough token estimate
  const avgContentLength = bookmarks.reduce((sum, b) => sum + b.content.length, 0) / Math.max(bookmarks.length, 1);
  const tokensPerBookmark = Math.ceil((avgContentLength + 1000) / 4 * 3); // 3 calls per bookmark

  return {
    estimated_cost: totalCost,
    estimated_tokens: tokensPerBookmark * bookmarks.length,
    bookmarks_count: bookmarks.length,
  };
}

/**
 * Report progress
 */
function reportProgress(
  onProgress: ((progress: EnrichmentProgress) => void) | undefined,
  total: number,
  completed: number,
  step: 'intent' | 'context' | 'category' | 'connections',
  currentCost: number,
  estimatedCost: number
): void {
  if (!onProgress) return;

  const stepWeights = {
    intent: 0.35,
    context: 0.35,
    category: 0.15,
    connections: 0.15,
  };

  const stepProgress = completed / total;
  const cumulativeProgress =
    (step === 'intent' ? 0 : stepWeights.intent) +
    (step === 'context' ? stepProgress * stepWeights.context : step === 'intent' ? 0 : stepWeights.context) +
    (step === 'category' ? stepProgress * stepWeights.category : ['intent', 'context'].includes(step) ? 0 : stepWeights.category) +
    (step === 'connections' ? stepProgress * stepWeights.connections : 0);

  const remainingRatio = 1 - cumulativeProgress;
  const avgTimePerBookmark = 2000; // 2 seconds estimate
  const estimatedTimeRemaining = Math.ceil(remainingRatio * total * avgTimePerBookmark);

  onProgress({
    total_bookmarks: total,
    completed,
    current_step: step,
    estimated_time_remaining_ms: estimatedTimeRemaining,
    estimated_cost: estimatedCost || currentCost * 1.2, // Add 20% buffer
    current_cost: currentCost,
  });
}
