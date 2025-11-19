/**
 * System Configuration Service
 * Reads configuration values from database system_settings table
 * Matches web module configuration structure for consistency
 */

import { sql } from '../lib/db/config';

// AI Configuration interface matching web module
export interface AIConfig {
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

export class SystemConfigService {
  private configCache: AIConfig | null = null;
  private configCacheTime: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // No longer need pool instance with postgres library
  }

  /**
   * Get AI configuration from database
   * Uses caching to avoid frequent database queries
   * Matches web module logic for consistency
   */
  async getAIConfig(): Promise<AIConfig | null> {
    const now = Date.now();
    
    // Return cached config if still valid
    if (this.configCache && (now - this.configCacheTime) < this.CACHE_TTL) {
      console.log('[SystemConfigService] Using cached AI config:', { serviceType: this.configCache.aiServiceType });
      return this.configCache;
    }

    console.log('[SystemConfigService] Loading AI config from database...');

    try {
      const result = await sql`SELECT setting_key, setting_value FROM system_settings ORDER BY setting_key`;

      const settings = result.reduce((acc, row) => {
        acc[row.setting_key] = row.setting_value;
        return acc;
      }, {} as Record<string, any>);

      console.log('[SystemConfigService] Loaded config from database:', { 
        serviceType: settings.aiServiceType,
        hasOpenaiKey: !!settings.openaiKey,
        hasAnthropicKey: !!settings.anthropicKey,
        hasCustomKey: !!settings.customApiKey
      });

      // Use database config if available
      if (settings && settings.aiServiceType) {
        this.configCache = settings;
        this.configCacheTime = now;
        return settings;
      }

      // Fallback to environment variables for backward compatibility
      const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
      const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';
      const EMBEDDING_MODEL = 'text-embedding-3-small';

      if (OPENAI_API_KEY) {
        console.log('[SystemConfigService] Using OPENAI_API_KEY from environment variables');
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

      console.warn('[SystemConfigService] No AI configuration found in environment variables or database');
      return null;

    } catch (error) {
      console.error('[SystemConfigService] Error loading config from database:', error);
      
      // Return null on error, consistent with web module behavior
      return null;
    }
  }

  /**
   * Check if embedding service is available
   */
  async isEmbeddingServiceAvailable(): Promise<boolean> {
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

  /**
   * Clear configuration cache (useful for testing or when settings are updated)
   */
  clearCache(): void {
    this.configCache = null;
    this.configCacheTime = 0;
  }
}