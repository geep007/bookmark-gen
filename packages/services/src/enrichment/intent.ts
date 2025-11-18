/**
 * Intent & Reason Enrichment Service
 * Generates AI-powered intent analysis for why a bookmark was saved
 */

import type { Bookmark } from '@bookmark-gen/shared';
import type { IntentResult, LLMResult } from './types';
import { getLLMClient } from './llm-client';

/**
 * System prompt for intent generation
 */
const INTENT_SYSTEM_PROMPT = `You are an expert at analyzing social media bookmarks and understanding user intent.

Your task is to analyze a bookmark and explain WHY the user likely saved it.

Consider:
- The content topic and key insights
- The author's expertise and credibility
- Potential use cases: prospecting/leads, creative inspiration, learning/skill-building
- The actionable value this bookmark provides

Output a concise 1-2 sentence explanation that captures the user's likely motivation.

Format your response as JSON:
{
  "intent": "Brief explanation of why this was bookmarked",
  "confidence": 0.85
}

The confidence score should be between 0 and 1, where:
- 0.9-1.0: Very clear intent based on content
- 0.7-0.9: Good understanding of likely intent
- 0.5-0.7: Moderate confidence
- Below 0.5: Unclear intent`;

/**
 * Generate user prompt for intent analysis
 */
function generateIntentPrompt(bookmark: Bookmark): string {
  const source = bookmark.source === 'twitter' ? 'Twitter/X' :
                 bookmark.source === 'linkedin' ? 'LinkedIn' : 'Eagle';

  return `Analyze this ${source} bookmark:

Author: ${bookmark.author}
Content: ${bookmark.content}
URL: ${bookmark.url}
${bookmark.author_url ? `Author Profile: ${bookmark.author_url}` : ''}

Why did the user likely save this bookmark? What value does it provide?`;
}

/**
 * Parse intent response from LLM
 */
function parseIntentResponse(content: string): IntentResult {
  try {
    // Try to parse as JSON
    const json = JSON.parse(content);

    if (json.intent && typeof json.confidence === 'number') {
      return {
        intent: json.intent,
        confidence: Math.max(0, Math.min(1, json.confidence)),
      };
    }
  } catch (error) {
    // If JSON parsing fails, treat the entire response as intent
    console.warn('⚠️  Failed to parse intent JSON, using raw text');
  }

  // Fallback: use the content as-is
  return {
    intent: content.trim(),
    confidence: 0.6, // Default moderate confidence
  };
}

/**
 * Generate intent for a bookmark
 */
export async function generateIntent(bookmark: Bookmark): Promise<LLMResult<IntentResult>> {
  const client = getLLMClient();

  const systemPrompt = INTENT_SYSTEM_PROMPT;
  const userPrompt = generateIntentPrompt(bookmark);

  return await client.callWithRetry(
    'intent',
    systemPrompt,
    userPrompt,
    parseIntentResponse
  );
}

/**
 * Generate intents for multiple bookmarks
 */
export async function generateIntentBatch(
  bookmarks: Bookmark[],
  onProgress?: (current: number, total: number) => void
): Promise<Array<{ bookmark_id: string; result: LLMResult<IntentResult>; error?: string }>> {
  const results: Array<{ bookmark_id: string; result: LLMResult<IntentResult>; error?: string }> = [];

  for (let i = 0; i < bookmarks.length; i++) {
    const bookmark = bookmarks[i];

    try {
      const result = await generateIntent(bookmark);
      results.push({
        bookmark_id: bookmark.id,
        result,
      });
    } catch (error) {
      console.error(`❌ Failed to generate intent for bookmark ${bookmark.id}:`, error);
      results.push({
        bookmark_id: bookmark.id,
        result: {
          data: { intent: '', confidence: 0 },
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
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return results;
}

/**
 * Estimate cost for generating intent for bookmarks
 */
export function estimateIntentCost(bookmarks: Bookmark[]): number {
  const avgContentLength = bookmarks.reduce((sum, b) => sum + b.content.length, 0) / bookmarks.length;
  const avgPromptTokens = Math.ceil((avgContentLength + 500) / 4); // ~4 chars per token
  const avgCompletionTokens = 100; // ~1-2 sentences

  // Use the default expensive model pricing (gpt-4o)
  const inputCostPerToken = 2.50 / 1_000_000;
  const outputCostPerToken = 10.00 / 1_000_000;

  const costPerBookmark = (avgPromptTokens * inputCostPerToken) + (avgCompletionTokens * outputCostPerToken);

  return bookmarks.length * costPerBookmark;
}
