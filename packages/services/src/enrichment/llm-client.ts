/**
 * LLM Client with multi-model routing and cost tracking
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import type {
  LLMProvider,
  EnrichmentTask,
  LLMResult,
  TokenUsage,
  ModelConfig,
} from './types';
import { calculateCost, normalizeModelName } from './cost-tracker';
import { getConfig } from '../config';

/**
 * Retry configuration
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Model routing configuration based on task type
 */
export class LLMClient {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  private config = getConfig();

  constructor() {
    // Initialize clients based on available API keys
    if (this.config.llm.openai_api_key) {
      this.openai = new OpenAI({
        apiKey: this.config.llm.openai_api_key,
      });
    }

    if (this.config.llm.anthropic_api_key) {
      this.anthropic = new Anthropic({
        apiKey: this.config.llm.anthropic_api_key,
      });
    }

    if (!this.openai && !this.anthropic) {
      throw new Error('No LLM API keys configured. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY.');
    }
  }

  /**
   * Get model configuration for a specific enrichment task
   */
  getModelConfig(task: EnrichmentTask): ModelConfig {
    let modelName: string;

    switch (task) {
      case 'category':
        // Cheap model for categorization
        modelName = this.config.llm.model_category || 'gpt-4o-mini';
        break;
      case 'intent':
        // Expensive model for intent generation
        modelName = this.config.llm.model_intent || 'gpt-4o';
        break;
      case 'context':
        // Expensive model for context extraction
        modelName = this.config.llm.model_context || 'gpt-4o';
        break;
      case 'outreach':
        // Expensive model for outreach suggestions
        modelName = this.config.llm.model_intent || 'gpt-4o';
        break;
      default:
        modelName = 'gpt-4o-mini';
    }

    // Determine provider based on model name
    const provider: LLMProvider = modelName.includes('claude') ? 'anthropic' : 'openai';

    // Verify provider is available
    if (provider === 'openai' && !this.openai) {
      // Fallback to Anthropic if available
      if (this.anthropic) {
        return {
          provider: 'anthropic',
          model: 'claude-sonnet-3.5',
          max_tokens: task === 'category' ? 100 : 500,
          temperature: 0.3,
        };
      }
      throw new Error('OpenAI API key not configured');
    }

    if (provider === 'anthropic' && !this.anthropic) {
      // Fallback to OpenAI if available
      if (this.openai) {
        return {
          provider: 'openai',
          model: task === 'category' ? 'gpt-4o-mini' : 'gpt-4o',
          max_tokens: task === 'category' ? 100 : 500,
          temperature: 0.3,
        };
      }
      throw new Error('Anthropic API key not configured');
    }

    return {
      provider,
      model: modelName,
      max_tokens: task === 'category' ? 100 : 500,
      temperature: 0.3,
    };
  }

  /**
   * Call LLM with retry logic and exponential backoff
   */
  async callWithRetry<T>(
    task: EnrichmentTask,
    systemPrompt: string,
    userPrompt: string,
    parseResponse: (content: string) => T
  ): Promise<LLMResult<T>> {
    const modelConfig = this.getModelConfig(task);
    let lastError: Error | null = null;
    let delay = RETRY_CONFIG.initialDelayMs;

    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      try {
        if (modelConfig.provider === 'openai') {
          return await this.callOpenAI(modelConfig, systemPrompt, userPrompt, parseResponse);
        } else {
          return await this.callAnthropic(modelConfig, systemPrompt, userPrompt, parseResponse);
        }
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable (rate limit, network issues)
        const isRetryable = this.isRetryableError(error);

        if (!isRetryable || attempt === RETRY_CONFIG.maxRetries) {
          throw error;
        }

        console.warn(
          `⚠️  LLM API call failed (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1}). Retrying in ${delay}ms...`
        );

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Increase delay for next attempt (exponential backoff)
        delay = Math.min(delay * RETRY_CONFIG.backoffMultiplier, RETRY_CONFIG.maxDelayMs);
      }
    }

    throw lastError || new Error('LLM API call failed after retries');
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('rate limit') ||
        message.includes('timeout') ||
        message.includes('network') ||
        message.includes('503') ||
        message.includes('429')
      );
    }
    return false;
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI<T>(
    config: ModelConfig,
    systemPrompt: string,
    userPrompt: string,
    parseResponse: (content: string) => T
  ): Promise<LLMResult<T>> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const response = await this.openai.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: config.max_tokens,
      temperature: config.temperature,
    });

    const content = response.choices[0]?.message?.content || '';
    const usage: TokenUsage = {
      prompt_tokens: response.usage?.prompt_tokens || 0,
      completion_tokens: response.usage?.completion_tokens || 0,
      total_tokens: response.usage?.total_tokens || 0,
    };

    const normalizedModel = normalizeModelName(config.model);
    const cost = calculateCost(normalizedModel, usage);

    return {
      data: parseResponse(content),
      usage,
      model: config.model,
      provider: 'openai',
      cost,
    };
  }

  /**
   * Call Anthropic API
   */
  private async callAnthropic<T>(
    config: ModelConfig,
    systemPrompt: string,
    userPrompt: string,
    parseResponse: (content: string) => T
  ): Promise<LLMResult<T>> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized');
    }

    const response = await this.anthropic.messages.create({
      model: config.model,
      max_tokens: config.max_tokens,
      temperature: config.temperature,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
    });

    const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const usage: TokenUsage = {
      prompt_tokens: response.usage.input_tokens,
      completion_tokens: response.usage.output_tokens,
      total_tokens: response.usage.input_tokens + response.usage.output_tokens,
    };

    const normalizedModel = normalizeModelName(config.model);
    const cost = calculateCost(normalizedModel, usage);

    return {
      data: parseResponse(content),
      usage,
      model: config.model,
      provider: 'anthropic',
      cost,
    };
  }

  /**
   * Test connection to LLM providers
   */
  async testConnection(): Promise<{
    openai: boolean;
    anthropic: boolean;
    error?: string;
  }> {
    const result = {
      openai: false,
      anthropic: false,
      error: undefined as string | undefined,
    };

    // Test OpenAI
    if (this.openai) {
      try {
        await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 5,
        });
        result.openai = true;
      } catch (error) {
        console.error('OpenAI connection test failed:', error);
        result.error = `OpenAI: ${(error as Error).message}`;
      }
    }

    // Test Anthropic
    if (this.anthropic) {
      try {
        await this.anthropic.messages.create({
          model: 'claude-haiku-3.5',
          max_tokens: 5,
          messages: [{ role: 'user', content: 'Hello' }],
        });
        result.anthropic = true;
      } catch (error) {
        console.error('Anthropic connection test failed:', error);
        result.error = result.error
          ? `${result.error} | Anthropic: ${(error as Error).message}`
          : `Anthropic: ${(error as Error).message}`;
      }
    }

    return result;
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): LLMProvider[] {
    const providers: LLMProvider[] = [];
    if (this.openai) providers.push('openai');
    if (this.anthropic) providers.push('anthropic');
    return providers;
  }
}

/**
 * Singleton instance
 */
let llmClientInstance: LLMClient | null = null;

/**
 * Get LLM client instance
 */
export function getLLMClient(): LLMClient {
  if (!llmClientInstance) {
    llmClientInstance = new LLMClient();
  }
  return llmClientInstance;
}
