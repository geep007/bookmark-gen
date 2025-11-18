/**
 * Context Extraction & Author Analysis Service
 * Extracts structured metadata: author bio, company, topic, themes
 */

import type { Bookmark } from '@bookmark-gen/shared';
import type { ContextResult, LLMResult } from './types';
import { getLLMClient } from './llm-client';

/**
 * System prompt for context extraction
 */
const CONTEXT_SYSTEM_PROMPT = `You are an expert at extracting structured metadata from social media content.

Your task is to analyze a bookmark and extract:
1. Author bio/expertise (if identifiable from content or profile)
2. Company or affiliation (if mentioned)
3. Primary topic (main subject matter)
4. Key themes (2-5 relevant tags)

Be concise and accurate. If information is not available, use null or empty values.

Format your response as JSON:
{
  "author_bio": "Brief description of author's expertise" or null,
  "company": "Company name or affiliation" or null,
  "primary_topic": "Main subject area",
  "key_themes": ["Theme 1", "Theme 2", "Theme 3"]
}`;

/**
 * Generate user prompt for context extraction
 */
function generateContextPrompt(bookmark: Bookmark): string {
  const source = bookmark.source === 'twitter' ? 'Twitter/X' :
                 bookmark.source === 'linkedin' ? 'LinkedIn' : 'Eagle';

  return `Extract metadata from this ${source} bookmark:

Author: ${bookmark.author}
Content: ${bookmark.content}
${bookmark.author_url ? `Author Profile: ${bookmark.author_url}` : ''}

Please extract:
- Author expertise/bio (if identifiable)
- Company/affiliation (if mentioned)
- Primary topic
- Key themes (2-5 tags)`;
}

/**
 * Parse context response from LLM
 */
function parseContextResponse(content: string): ContextResult {
  try {
    const json = JSON.parse(content);

    return {
      author_bio: json.author_bio || undefined,
      company: json.company || undefined,
      primary_topic: json.primary_topic || 'Unknown',
      key_themes: Array.isArray(json.key_themes) ? json.key_themes : [],
    };
  } catch (error) {
    console.warn('⚠️  Failed to parse context JSON:', error);

    // Fallback: try to extract basic info from raw text
    return {
      primary_topic: 'General',
      key_themes: [],
    };
  }
}

/**
 * Generate context for a bookmark
 */
export async function generateContext(bookmark: Bookmark): Promise<LLMResult<ContextResult>> {
  const client = getLLMClient();

  const systemPrompt = CONTEXT_SYSTEM_PROMPT;
  const userPrompt = generateContextPrompt(bookmark);

  return await client.callWithRetry(
    'context',
    systemPrompt,
    userPrompt,
    parseContextResponse
  );
}

/**
 * Generate context for multiple bookmarks
 */
export async function generateContextBatch(
  bookmarks: Bookmark[],
  onProgress?: (current: number, total: number) => void
): Promise<Array<{ bookmark_id: string; result: LLMResult<ContextResult>; error?: string }>> {
  const results: Array<{ bookmark_id: string; result: LLMResult<ContextResult>; error?: string }> = [];

  for (let i = 0; i < bookmarks.length; i++) {
    const bookmark = bookmarks[i];

    try {
      const result = await generateContext(bookmark);
      results.push({
        bookmark_id: bookmark.id,
        result,
      });
    } catch (error) {
      console.error(`❌ Failed to generate context for bookmark ${bookmark.id}:`, error);
      results.push({
        bookmark_id: bookmark.id,
        result: {
          data: { primary_topic: 'Error', key_themes: [] },
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
 * Estimate cost for generating context for bookmarks
 */
export function estimateContextCost(bookmarks: Bookmark[]): number {
  const avgContentLength = bookmarks.reduce((sum, b) => sum + b.content.length, 0) / bookmarks.length;
  const avgPromptTokens = Math.ceil((avgContentLength + 500) / 4);
  const avgCompletionTokens = 150; // More detailed output than intent

  // Use the default expensive model pricing (gpt-4o)
  const inputCostPerToken = 2.50 / 1_000_000;
  const outputCostPerToken = 10.00 / 1_000_000;

  const costPerBookmark = (avgPromptTokens * inputCostPerToken) + (avgCompletionTokens * outputCostPerToken);

  return bookmarks.length * costPerBookmark;
}
