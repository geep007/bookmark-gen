/**
 * Category Assignment & Classification Service
 * Auto-categorizes bookmarks into Inspo, Leads/Markets, or Tutorials
 */

import type { Bookmark, CategoryType } from '@bookmark-gen/shared';
import type { CategoryResult, LLMResult, ContextResult, IntentResult } from './types';
import { getLLMClient } from './llm-client';

/**
 * System prompt for category assignment
 */
const CATEGORY_SYSTEM_PROMPT = `You are an expert at categorizing social media bookmarks into three categories:

1. **Inspo** (💡): Creative references, aesthetic signals, design inspiration, innovative ideas
   - Examples: Design portfolios, creative campaigns, visual inspiration, artistic work

2. **Leads/Markets** (🎯): Potential clients, business opportunities, industry insights, prospects
   - Examples: Agency profiles, company posts, business leaders, market opportunities

3. **Tutorials** (📚): Learning resources, how-to content, skill-building guides, educational material
   - Examples: Technical guides, tutorials, courses, explanatory threads, skill development

Analyze the bookmark and assign it to ONE category.

Provide a confidence score (0-1) based on how clearly the content fits the category.

Format your response as JSON:
{
  "category": "Inspo" | "Leads/Markets" | "Tutorials",
  "confidence": 0.85,
  "reasoning": "Brief explanation of why this category was chosen"
}`;

/**
 * Generate user prompt for category assignment
 */
function generateCategoryPrompt(
  bookmark: Bookmark,
  intent?: IntentResult,
  context?: ContextResult
): string {
  let prompt = `Categorize this bookmark:

Author: ${bookmark.author}
Content: ${bookmark.content}`;

  // Add enrichment context if available
  if (intent) {
    prompt += `\n\nUser Intent: ${intent.intent}`;
  }

  if (context) {
    prompt += `\n\nTopic: ${context.primary_topic}`;
    if (context.key_themes?.length) {
      prompt += `\nThemes: ${context.key_themes.join(', ')}`;
    }
    if (context.company) {
      prompt += `\nCompany: ${context.company}`;
    }
  }

  prompt += `\n\nWhich category does this belong to: Inspo, Leads/Markets, or Tutorials?`;

  return prompt;
}

/**
 * Parse category response from LLM
 */
function parseCategoryResponse(content: string): CategoryResult {
  try {
    const json = JSON.parse(content);

    // Validate category
    const validCategories: CategoryType[] = ['Inspo', 'Leads/Markets', 'Tutorials'];
    const category = validCategories.includes(json.category) ? json.category : 'Inspo';

    return {
      category,
      confidence: Math.max(0, Math.min(1, json.confidence || 0.7)),
      reasoning: json.reasoning,
    };
  } catch (error) {
    console.warn('⚠️  Failed to parse category JSON:', error);

    // Fallback: try to extract category from text
    const text = content.toLowerCase();
    let category: CategoryType = 'Inspo';

    if (text.includes('leads') || text.includes('markets') || text.includes('business') || text.includes('client')) {
      category = 'Leads/Markets';
    } else if (text.includes('tutorial') || text.includes('learning') || text.includes('how-to') || text.includes('guide')) {
      category = 'Tutorials';
    } else if (text.includes('inspo') || text.includes('inspiration') || text.includes('creative')) {
      category = 'Inspo';
    }

    return {
      category,
      confidence: 0.5, // Low confidence for fallback
    };
  }
}

/**
 * Assign category to a bookmark
 */
export async function assignCategory(
  bookmark: Bookmark,
  intent?: IntentResult,
  context?: ContextResult
): Promise<LLMResult<CategoryResult>> {
  const client = getLLMClient();

  const systemPrompt = CATEGORY_SYSTEM_PROMPT;
  const userPrompt = generateCategoryPrompt(bookmark, intent, context);

  return await client.callWithRetry(
    'category',
    systemPrompt,
    userPrompt,
    parseCategoryResponse
  );
}

/**
 * Assign categories to multiple bookmarks
 */
export async function assignCategoryBatch(
  bookmarks: Array<{
    bookmark: Bookmark;
    intent?: IntentResult;
    context?: ContextResult;
  }>,
  onProgress?: (current: number, total: number) => void
): Promise<Array<{ bookmark_id: string; result: LLMResult<CategoryResult>; error?: string }>> {
  const results: Array<{ bookmark_id: string; result: LLMResult<CategoryResult>; error?: string }> = [];

  for (let i = 0; i < bookmarks.length; i++) {
    const { bookmark, intent, context } = bookmarks[i];

    try {
      const result = await assignCategory(bookmark, intent, context);
      results.push({
        bookmark_id: bookmark.id,
        result,
      });
    } catch (error) {
      console.error(`❌ Failed to assign category for bookmark ${bookmark.id}:`, error);
      results.push({
        bookmark_id: bookmark.id,
        result: {
          data: { category: 'Inspo', confidence: 0 },
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
          model: 'error',
          provider: 'openai',
          cost: 0,
        },
        error: (error as Error).message,
      });
    }

    // Report progress
    if (onProgress) {
      onProgress(i + 1, bookmarks.length);
    }

    // Small delay between requests to avoid rate limits
    if (i < bookmarks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}

/**
 * Estimate cost for categorizing bookmarks
 */
export function estimateCategoryCost(bookmarks: Bookmark[]): number {
  const avgContentLength = bookmarks.reduce((sum, b) => sum + b.content.length, 0) / bookmarks.length;
  const avgPromptTokens = Math.ceil((avgContentLength + 600) / 4); // Includes enrichment context
  const avgCompletionTokens = 50; // Short output

  // Use cheap model pricing (gpt-4o-mini)
  const inputCostPerToken = 0.15 / 1_000_000;
  const outputCostPerToken = 0.60 / 1_000_000;

  const costPerBookmark = (avgPromptTokens * inputCostPerToken) + (avgCompletionTokens * outputCostPerToken);

  return bookmarks.length * costPerBookmark;
}

/**
 * Get category distribution from results
 */
export function getCategoryDistribution(
  results: Array<{ result: LLMResult<CategoryResult> }>
): Record<CategoryType, number> {
  const distribution: Record<CategoryType, number> = {
    'Inspo': 0,
    'Leads/Markets': 0,
    'Tutorials': 0,
  };

  for (const { result } of results) {
    const category = result.data.category;
    distribution[category]++;
  }

  return distribution;
}

/**
 * Flag low-confidence categorizations
 */
export function getLowConfidenceBookmarks(
  results: Array<{ bookmark_id: string; result: LLMResult<CategoryResult> }>,
  threshold: number = 0.7
): string[] {
  return results
    .filter(({ result }) => result.data.confidence < threshold)
    .map(({ bookmark_id }) => bookmark_id);
}
