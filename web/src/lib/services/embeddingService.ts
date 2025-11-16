/**
 * Embedding Service
 * Generates embeddings using AI API (OpenAI, Anthropic, or custom) for vector similarity search
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const SETTINGS_KEY = 'ai_config';

interface AIConfig {
  aiServiceType?: 'openai' | 'anthropic' | 'custom';
  openaiKey?: string;
  openaiApiUrl?: string;
  openaiModel?: string;
  anthropicKey?: string;
  anthropicApiUrl?: string;
  anthropicModel?: string;
  customApiKey?: string;
  customApiUrl?: string;
  customModel?: string;
}

// Fallback to environment variables for backward compatibility
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';
const EMBEDDING_MODEL = 'text-embedding-3-small'; // 1536 dimensions

export class EmbeddingService {
  private configCache: AIConfig | null = null;
  private configCacheTime: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private supabaseClient?: ReturnType<typeof createClient<Database>>;

  constructor(supabaseClient?: ReturnType<typeof createClient<Database>>) {
    this.supabaseClient = supabaseClient;
  }

  /**
   * Get AI configuration from database or environment variables
   */
  private async getAIConfig(): Promise<AIConfig | null> {
    // Check cache first
    const now = Date.now();
    if (this.configCache && (now - this.configCacheTime) < this.CACHE_TTL) {
      console.log('[EmbeddingService] Using cached AI config:', { serviceType: this.configCache.aiServiceType });
      return this.configCache;
    }

    console.log('[EmbeddingService] Loading AI config from database...');
    console.log('[EmbeddingService] SUPABASE_SERVICE_ROLE_KEY available:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('[EmbeddingService] Looking for setting key:', SETTINGS_KEY);

    try {
      // Try to get supabase client
      let supabase: ReturnType<typeof createClient<Database>> | null = null;
      
      console.log('[EmbeddingService] Checking for supabase client:', {
        hasProvidedClient: !!this.supabaseClient,
        hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      });
      
      // First, use provided client if available
      if (this.supabaseClient) {
        supabase = this.supabaseClient;
        console.log('[EmbeddingService] Using provided supabase client');
      } 
      // Then try service role key
      else if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          supabase = createAdminClient();
          console.log('[EmbeddingService] Using admin client with service role key');
        } catch (err) {
          console.error('[EmbeddingService] Failed to create admin client:', err);
        }
      }

      if (supabase) {
        try {
          console.log('[EmbeddingService] Querying system_settings table...');
          
          const { data: setting, error } = await supabase
            .from('system_settings')
            .select('setting_value')
            .eq('setting_key', SETTINGS_KEY)
            .single();

          if (error) {
            if (error.code === 'PGRST116') {
              console.warn('[EmbeddingService] AI config not found in database (PGRST116 - not found)');
            } else {
              console.error('[EmbeddingService] Error fetching AI config from database:', {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint
              });
            }
          } else {
            console.log('[EmbeddingService] Found setting in database:', {
              hasValue: !!setting?.setting_value,
              valueType: typeof setting?.setting_value,
              isObject: setting?.setting_value && typeof setting.setting_value === 'object',
              valueKeys: setting?.setting_value && typeof setting.setting_value === 'object' 
                ? Object.keys(setting.setting_value) 
                : null
            });

            if (setting?.setting_value) {
              const config = setting.setting_value as AIConfig;
              console.log('[EmbeddingService] Parsed AI config:', {
                aiServiceType: config.aiServiceType,
                hasOpenaiKey: !!config.openaiKey,
                hasCustomKey: !!config.customApiKey,
                hasAnthropicKey: !!config.anthropicKey,
                customApiUrl: config.customApiUrl,
                customModel: config.customModel,
                openaiApiUrl: config.openaiApiUrl,
                openaiModel: config.openaiModel
              });

              this.configCache = config;
              this.configCacheTime = now;
              return this.configCache;
            } else {
              console.warn('[EmbeddingService] Setting found but setting_value is null or undefined');
            }
          }
        } catch (dbError) {
          console.error('[EmbeddingService] Failed to load AI config from database:', dbError);
          if (dbError instanceof Error) {
            console.error('[EmbeddingService] Database error details:', {
              message: dbError.message,
              stack: dbError.stack
            });
          }
          // Continue to fallback to environment variables
        }
      } else {
        console.warn('[EmbeddingService] No supabase client available (no service role key and no client provided), skipping database config lookup');
      }
    } catch (error) {
      console.error('[EmbeddingService] Unexpected error loading AI config:', error);
    }

    // Fallback to environment variables for backward compatibility
    console.log('[EmbeddingService] Checking environment variables...');
    if (OPENAI_API_KEY) {
      console.log('[EmbeddingService] Using OPENAI_API_KEY from environment variables');
      return {
        aiServiceType: 'openai',
        openaiKey: OPENAI_API_KEY,
        openaiApiUrl: OPENAI_API_URL.replace('/embeddings', ''),
        openaiModel: EMBEDDING_MODEL
      };
    }

    console.warn('[EmbeddingService] No AI configuration found in database or environment variables');
    return null;
  }

  /**
   * Generate embedding for a text string
   * @param text The text to generate embedding for
   * @returns Embedding vector as array of numbers
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const config = await this.getAIConfig();
    
    if (!config) {
      const errorMsg = 'AI configuration not found. Please configure AI settings in admin panel or set OPENAI_API_KEY environment variable.';
      console.warn(errorMsg);
      throw new Error(errorMsg);
    }

    const serviceType = config.aiServiceType || 'openai';
    let apiUrl: string;
    let apiKey: string;
    let model: string;
    let requestBody: any;

    // Determine API configuration based on service type
    // Priority: custom > anthropic > openai
    // Also check if custom config is available even if serviceType is not 'custom'
    if ((serviceType === 'custom' || (serviceType === 'openai' && !config.openaiKey)) 
        && config.customApiUrl && config.customApiKey && config.customModel) {
      // Use custom API (either explicitly set or as fallback when openai key is missing)
      apiUrl = config.customApiUrl.endsWith('/embeddings') 
        ? config.customApiUrl 
        : `${config.customApiUrl.replace(/\/$/, '')}/embeddings`;
      apiKey = config.customApiKey;
      model = config.customModel;
      console.log('[EmbeddingService] Using custom AI service:', { apiUrl, model });
      // Custom API might have different format, try OpenAI-compatible first
      requestBody = {
        model,
        input: text.trim()
      };
    } else if (serviceType === 'anthropic' && config.anthropicKey && config.anthropicApiUrl && config.anthropicModel) {
      // Anthropic doesn't have embeddings API, but we'll try if user configured it
      apiUrl = config.anthropicApiUrl.endsWith('/embeddings')
        ? config.anthropicApiUrl
        : `${config.anthropicApiUrl.replace(/\/$/, '')}/embeddings`;
      apiKey = config.anthropicKey;
      model = config.anthropicModel;
      console.log('[EmbeddingService] Using Anthropic service:', { apiUrl, model });
      requestBody = {
        model,
        input: text.trim()
      };
    } else if (config.openaiKey && config.openaiApiUrl && config.openaiModel) {
      // OpenAI or OpenAI-compatible API
      apiUrl = config.openaiApiUrl.endsWith('/embeddings')
        ? config.openaiApiUrl
        : `${config.openaiApiUrl.replace(/\/$/, '')}/embeddings`;
      apiKey = config.openaiKey;
      model = config.openaiModel;
      console.log('[EmbeddingService] Using OpenAI service:', { apiUrl, model });
      requestBody = {
        model,
        input: text.trim()
      };
    } else {
      const errorMsg = `Incomplete AI configuration for service type: ${serviceType}. Please check your settings. Available: custom=${!!(config.customApiUrl && config.customApiKey && config.customModel)}, openai=${!!(config.openaiKey && config.openaiApiUrl && config.openaiModel)}, anthropic=${!!(config.anthropicKey && config.anthropicApiUrl && config.anthropicModel)}`;
      console.warn(errorMsg, config);
      throw new Error(errorMsg);
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`AI API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      console.log('[EmbeddingService] API response structure:', {
        hasData: !!data.data,
        hasEmbedding: !!data.embedding,
        isArray: Array.isArray(data),
        dataKeys: Object.keys(data || {}),
        dataDataLength: data.data?.length,
        firstItemHasEmbedding: data.data?.[0]?.embedding ? true : false
      });
      
      // Handle different response formats
      // OpenAI format: { data: [{ embedding: [...] }] }
      // SiliconFlow/bge-m3 format: { data: [{ embedding: [...] }] } (same as OpenAI)
      // Some custom APIs might return: { embedding: [...] } directly
      let embedding: number[] | null = null;
      
      if (data.data && Array.isArray(data.data) && data.data[0]?.embedding) {
        embedding = data.data[0].embedding;
      } else if (Array.isArray(data.embedding)) {
        embedding = data.embedding;
      } else if (Array.isArray(data)) {
        embedding = data;
      }
      
      if (!embedding || !Array.isArray(embedding)) {
        console.error('[EmbeddingService] Unexpected API response format:', {
          data: JSON.stringify(data).substring(0, 500)
        });
        throw new Error('Unexpected API response format');
      }
      
      console.log('[EmbeddingService] Extracted embedding:', {
        dimensions: embedding.length,
        firstFew: embedding.slice(0, 5)
      });
      
      return embedding;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw error;
    }
  }

  /**
   * Generate embedding for experience record
   * Combines title, problem_description, solution, keywords, etc. into a single text
   * @param experience The experience record
   * @returns Embedding vector as array of numbers
   */
  async generateExperienceEmbedding(experience: {
    title: string;
    problem_description: string;
    solution: string;
    root_cause?: string | null;
    context?: string | null;
    keywords?: string[];
  }): Promise<number[]> {
    // Combine all text fields for embedding
    // Order and structure the text to give balanced weight to all fields
    // Keywords are important for matching, so include them prominently
    const parts: string[] = [];
    
    // Add keywords first (if available) - they're important for matching
    if (experience.keywords && experience.keywords.length > 0) {
      parts.push(`Keywords: ${experience.keywords.join(', ')}`);
    }
    
    // Add title (important but not over-weighted)
    parts.push(`Title: ${experience.title}`);
    
    // Add problem description
    if (experience.problem_description) {
      parts.push(`Problem: ${experience.problem_description}`);
    }
    
    // Add root cause if available
    if (experience.root_cause) {
      parts.push(`Root Cause: ${experience.root_cause}`);
    }
    
    // Add solution (most important content)
    if (experience.solution) {
      parts.push(`Solution: ${experience.solution}`);
    }
    
    // Add context if available
    if (experience.context) {
      parts.push(`Context: ${experience.context}`);
    }
    
    // Join with double newlines for clear separation
    const text = parts.filter(Boolean).join('\n\n');

    return this.generateEmbedding(text);
  }

  /**
   * Check if embedding service is available
   */
  async isAvailable(): Promise<boolean> {
    const config = await this.getAIConfig();
    if (!config) {
      return false;
    }

    const serviceType = config.aiServiceType || 'openai';
    
    if (serviceType === 'custom') {
      return !!(config.customApiUrl && config.customApiKey && config.customModel);
    } else if (serviceType === 'anthropic') {
      return !!(config.anthropicKey && config.anthropicApiUrl && config.anthropicModel);
    } else {
      return !!(config.openaiKey && config.openaiApiUrl && config.openaiModel);
    }
  }
}

