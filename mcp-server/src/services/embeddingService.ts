/**
 * Embedding Service for MCP Server
 * Generates embeddings using configured API for vector similarity search
 * Configuration is loaded from database system_settings table
 * Matches web module implementation for consistency
 */

import { SystemConfigService, AIConfig } from './systemConfigService';

interface OpenAIErrorResponse {
  error?: {
    message?: string;
  };
}

interface OpenAIEmbeddingResponse {
  data: Array<{
    embedding: number[];
  }>;
}

export class EmbeddingService {
  private configService: SystemConfigService;
  private configCache: AIConfig | null = null;
  private configCacheTime: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(configService: SystemConfigService) {
    this.configService = configService;
  }

  /**
   * Get AI configuration from database first, then fallback to environment variables
   * Matches web module logic for consistency
   */
  private async getAIConfig(): Promise<AIConfig | null> {
    return await this.configService.getAIConfig();
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
        const error = await response.json().catch(() => ({ error: 'Unknown error' })) as OpenAIErrorResponse;
        throw new Error(`AI API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json() as OpenAIEmbeddingResponse;
      
      console.log('[EmbeddingService] API response structure:', {
        hasData: !!data.data,
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
    return await this.configService.isEmbeddingServiceAvailable();
  }
}

