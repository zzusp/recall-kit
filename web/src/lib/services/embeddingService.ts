/**
 * Embedding Service
 * Generates embeddings using AI API (OpenAI, Anthropic, or custom) for vector similarity search
 */

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

  /**
   * Get AI configuration from database first, then fallback to environment variables
   */
  private async getAIConfig(): Promise<AIConfig | null> {
    // Check cache first
    const now = Date.now();
    if (this.configCache && (now - this.configCacheTime) < this.CACHE_TTL) {
      console.log('[EmbeddingService] Using cached AI config:', { serviceType: this.configCache.aiServiceType });
      return this.configCache;
    }

    console.log('[EmbeddingService] Loading AI config from database...');

    try {
      // Try to get config from database
      // Note: This internal call bypasses authentication for embedding service
      const response = await fetch('/api/admin/settings', {
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Call': 'true', // Special header to bypass auth for internal calls
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[EmbeddingService] Loaded config from database:', { 
          serviceType: data.aiServiceType,
          hasOpenaiKey: !!data.openaiKey,
          hasAnthropicKey: !!data.anthropicKey,
          hasCustomKey: !!data.customApiKey
        });

        // Use database config if available
        if (data && data.aiServiceType) {
          this.configCache = data;
          this.configCacheTime = now;
          return data;
        }
      } else {
        console.warn('[EmbeddingService] Failed to load config from database:', response.status);
      }
    } catch (error) {
      console.warn('[EmbeddingService] Error loading config from database:', error);
    }

    console.log('[EmbeddingService] Falling back to environment variables...');

    // Fallback to environment variables
    if (OPENAI_API_KEY) {
      console.log('[EmbeddingService] Using OPENAI_API_KEY from environment variables');
      const config = {
        aiServiceType: 'openai' as const,
        openaiKey: OPENAI_API_KEY,
        openaiApiUrl: OPENAI_API_URL.replace('/embeddings', ''),
        openaiModel: EMBEDDING_MODEL
      };
      
      this.configCache = config;
      this.configCacheTime = now;
      return config;
    }

    console.warn('[EmbeddingService] No AI configuration found in environment variables or database');
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
      const errorMsg = 'AI configuration not found. Please configure AI service in admin settings.';
      console.warn(errorMsg);
      throw new Error(errorMsg);
    }

    const serviceType = config.aiServiceType || 'openai';
    let apiUrl: string;
    let apiKey: string;
    let model: string;
    let requestBody: any;

    // Determine API configuration based on service type
    if (serviceType === 'openai') {
      // OpenAI or OpenAI-compatible API
      if (!config.openaiKey || !config.openaiApiUrl || !config.openaiModel) {
        const errorMsg = `Incomplete OpenAI configuration. Please check your settings.`;
        console.warn(errorMsg, { hasKey: !!config.openaiKey, hasApiUrl: !!config.openaiApiUrl, hasModel: !!config.openaiModel });
        throw new Error(errorMsg);
      }
      
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
    } else if (serviceType === 'anthropic') {
      // Anthropic API (Note: Anthropic doesn't have a dedicated embeddings API, so we need to use a different approach)
      if (!config.anthropicKey || !config.anthropicApiUrl || !config.anthropicModel) {
        const errorMsg = `Incomplete Anthropic configuration. Please check your settings.`;
        console.warn(errorMsg, { hasKey: !!config.anthropicKey, hasApiUrl: !!config.anthropicApiUrl, hasModel: !!config.anthropicModel });
        throw new Error(errorMsg);
      }
      
      // Anthropic doesn't have embeddings API, so we'll use an OpenAI-compatible fallback or custom implementation
      // For now, we'll fall back to OpenAI format with a warning
      console.warn('[EmbeddingService] Anthropic doesn\'t have a dedicated embeddings API. Consider using OpenAI or a custom service.');
      throw new Error('Anthropic does not provide embeddings API. Please use OpenAI or custom service for embeddings.');
    } else if (serviceType === 'custom') {
      // Custom API
      if (!config.customApiKey || !config.customApiUrl || !config.customModel) {
        const errorMsg = `Incomplete custom service configuration. Please check your settings.`;
        console.warn(errorMsg, { hasKey: !!config.customApiKey, hasApiUrl: !!config.customApiUrl, hasModel: !!config.customModel });
        throw new Error(errorMsg);
      }
      
      // Assume custom API follows OpenAI format for embeddings
      apiUrl = config.customApiUrl.endsWith('/embeddings')
        ? config.customApiUrl
        : `${config.customApiUrl.replace(/\/$/, '')}/embeddings`;
      apiKey = config.customApiKey;
      model = config.customModel;
      console.log('[EmbeddingService] Using custom service:', { apiUrl, model });
      requestBody = {
        model,
        input: text.trim()
      };
    } else {
      const errorMsg = `Unsupported service type: ${serviceType}. Please use 'openai' or 'custom'.`;
      console.warn(errorMsg, { serviceType, config });
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
        firstValue: embedding[0] // Only log first value instead of first few
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
    // Order and structure text to give balanced weight to all fields
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
    
    if (serviceType === 'openai') {
      return !!(config.openaiKey && config.openaiApiUrl && config.openaiModel);
    } else if (serviceType === 'custom') {
      return !!(config.customApiKey && config.customApiUrl && config.customModel);
    } else if (serviceType === 'anthropic') {
      // Anthropic doesn't support embeddings, so always return false
      return false;
    }
    
    return false;
  }
}