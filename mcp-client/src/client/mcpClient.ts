import axios from 'axios';

export interface QueryExperienceParams {
  keywords?: string[];
  limit?: number;
  offset?: number;
  sort?: 'relevance' | 'query_count' | 'created_at';
}

export interface QueryExperienceResult {
  experiences: Array<{
    id: string;
    title: string;
    problem_description: string;
    root_cause?: string;
    solution: string;
    context?: string;
    keywords: string[];
    query_count: number;
    relevance_score: number;
    created_at: string;
  }>;
  total_count: number;
  has_more: boolean;
}

export interface SubmitExperienceParams {
  title: string;
  problem_description: string;
  root_cause?: string;
  solution: string;
  context?: string;
  keywords?: string[];
}

export interface SubmitExperienceResult {
  experience_id: string;
  status: 'success' | 'failed';
  error?: string;
}

export class MCPClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.MCP_SERVER_URL || 'http://localhost:3001';
  }

  async queryExperiences(params: QueryExperienceParams): Promise<QueryExperienceResult> {
    try {
      const response = await axios.post(`${this.baseUrl}/mcp`, {
        jsonrpc: '2.0',
        method: 'query_experiences',
        params,
        id: Date.now().toString()
      }, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.error) {
        throw new Error(`MCP Error: ${response.data.error.message}`);
      }

      return response.data.result;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Network error: ${error.message}`);
      }
      throw error;
    }
  }

  async submitExperience(params: SubmitExperienceParams): Promise<SubmitExperienceResult> {
    try {
      const response = await axios.post(`${this.baseUrl}/mcp`, {
        jsonrpc: '2.0',
        method: 'submit_experience',
        params,
        id: Date.now().toString()
      }, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.error) {
        throw new Error(`MCP Error: ${response.data.error.message}`);
      }

      return response.data.result;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Network error: ${error.message}`);
      }
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/health`, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}