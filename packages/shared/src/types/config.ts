/**
 * Configuration types for the application
 */

export interface LLMConfig {
  openai_api_key?: string;
  anthropic_api_key?: string;

  // Model routing configuration
  model_category?: string;  // For categorization (cheap model)
  model_intent?: string;     // For intent generation (expensive model)
  model_context?: string;    // For context extraction (expensive model)
}

export interface MCPConfig {
  twitter_token?: string;
  linkedin_token?: string;
}

export interface DatabaseConfig {
  path: string;
}

export interface VectorDBConfig {
  type: 'chroma' | 'pinecone';
  pinecone_api_key?: string;
  pinecone_environment?: string;
  chroma_path?: string;
}

export interface AppConfig {
  llm: LLMConfig;
  mcp: MCPConfig;
  database: DatabaseConfig;
  vector_db: VectorDBConfig;
}

// Environment variable validation
export interface EnvironmentVariables {
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  MCP_TWITTER_TOKEN?: string;
  MCP_LINKEDIN_TOKEN?: string;
  DATABASE_PATH: string;
  VECTOR_DB_TYPE: 'chroma' | 'pinecone';
  PINECONE_API_KEY?: string;
  PINECONE_ENVIRONMENT?: string;
  ENRICHMENT_MODEL_CATEGORY?: string;
  ENRICHMENT_MODEL_INTENT?: string;
  ENRICHMENT_MODEL_CONTEXT?: string;
}
