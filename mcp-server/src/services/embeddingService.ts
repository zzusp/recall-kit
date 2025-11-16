/**
 * Embedding Service for MCP Server
 * Generates embeddings using OpenAI API for vector similarity search
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';
const EMBEDDING_MODEL = 'text-embedding-3-small'; // 1536 dimensions

export class EmbeddingService {
  /**
   * Generate embedding for a text string
   * @param text The text to generate embedding for
   * @returns Embedding vector as array of numbers
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!OPENAI_API_KEY) {
      console.warn('OPENAI_API_KEY not configured, skipping embedding generation');
      return [];
    }

    try {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: text.trim()
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
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
  isAvailable(): boolean {
    return !!OPENAI_API_KEY;
  }
}

