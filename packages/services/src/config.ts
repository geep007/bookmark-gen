/**
 * Configuration service - Load and validate environment variables
 */

import type { AppConfig, EnvironmentVariables } from '@bookmark-gen/shared';

/**
 * Load and validate environment configuration
 */
export function loadConfig(): AppConfig {
  const env = process.env as Partial<EnvironmentVariables>;

  // Validate required variables
  const requiredVars: Array<keyof EnvironmentVariables> = ['DATABASE_PATH', 'VECTOR_DB_TYPE'];
  const missing = requiredVars.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate at least one LLM provider
  if (!env.OPENAI_API_KEY && !env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  Warning: No LLM API keys configured. Enrichment features will be disabled.');
  }

  // Validate at least one MCP connector
  if (!env.MCP_TWITTER_TOKEN && !env.MCP_LINKEDIN_TOKEN) {
    console.warn('⚠️  Warning: No MCP connector tokens configured. Sync features will be disabled.');
  }

  return {
    llm: {
      openai_api_key: env.OPENAI_API_KEY,
      anthropic_api_key: env.ANTHROPIC_API_KEY,
      model_category: env.ENRICHMENT_MODEL_CATEGORY || 'gpt-4o-mini',
      model_intent: env.ENRICHMENT_MODEL_INTENT || 'gpt-4o',
      model_context: env.ENRICHMENT_MODEL_CONTEXT || 'gpt-4o',
    },
    mcp: {
      twitter_token: env.MCP_TWITTER_TOKEN,
      linkedin_token: env.MCP_LINKEDIN_TOKEN,
    },
    database: {
      path: env.DATABASE_PATH!,
    },
    vector_db: {
      type: env.VECTOR_DB_TYPE as 'chroma' | 'pinecone',
      pinecone_api_key: env.PINECONE_API_KEY,
      pinecone_environment: env.PINECONE_ENVIRONMENT,
      chroma_path: './chroma_data',
    },
  };
}

/**
 * Check if LLM features are available
 */
export function isLLMAvailable(): boolean {
  const config = loadConfig();
  return !!(config.llm.openai_api_key || config.llm.anthropic_api_key);
}

/**
 * Check if MCP sync is available for a source
 */
export function isMCPAvailable(source: 'twitter' | 'linkedin'): boolean {
  const config = loadConfig();
  return source === 'twitter'
    ? !!config.mcp.twitter_token
    : !!config.mcp.linkedin_token;
}
