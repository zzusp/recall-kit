export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          email: string;
          role: string;
          created_at: string;
          updated_at: string;
          last_login_at: string | null;
        };
        Insert: {
          id: string;
          username: string;
          email: string;
          role?: string;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
        };
        Update: {
          id?: string;
          username?: string;
          email?: string;
          role?: string;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string | null;
        };
      };
      experience_records: {
        Row: {
          id: string;
          user_id: string | null;
          title: string;
          problem_description: string;
          root_cause: string | null;
          solution: string;
          context: string | null;
          status: string;
          query_count: number;
          view_count: number;
          relevance_score: number | null;
          fts: string | null;
          embedding: number[] | null;
          has_embedding: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          title: string;
          problem_description: string;
          root_cause?: string | null;
          solution: string;
          context?: string | null;
          status?: string;
          query_count?: number;
          view_count?: number;
          relevance_score?: number | null;
          embedding?: number[] | null;
          has_embedding?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          title?: string;
          problem_description?: string;
          root_cause?: string | null;
          solution?: string;
          context?: string | null;
          status?: string;
          query_count?: number;
          view_count?: number;
          relevance_score?: number | null;
          embedding?: number[] | null;
          has_embedding?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      experience_keywords: {
        Row: {
          id: string;
          experience_id: string;
          keyword: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          experience_id: string;
          keyword: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          experience_id?: string;
          keyword?: string;
          created_at?: string;
        };
      };
      query_logs: {
        Row: {
          id: string;
          query_keywords: string;
          result_count: number;
          response_time_ms: number | null;
          experience_ids: string[] | null;
          query_source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          query_keywords: string;
          result_count?: number;
          response_time_ms?: number | null;
          experience_ids?: string[] | null;
          query_source?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          query_keywords?: string;
          result_count?: number;
          response_time_ms?: number | null;
          experience_ids?: string[] | null;
          query_source?: string;
          created_at?: string;
        };
      };
      submission_logs: {
        Row: {
          id: string;
          experience_id: string | null;
          submission_status: string;
          error_message: string | null;
          validation_errors: any | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          experience_id?: string | null;
          submission_status: string;
          error_message?: string | null;
          validation_errors?: any | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          experience_id?: string | null;
          submission_status?: string;
          error_message?: string | null;
          validation_errors?: any | null;
          created_at?: string;
        };
      };
      admin_actions: {
        Row: {
          id: string;
          admin_id: string | null;
          action_type: string;
          target_type: string;
          target_id: string | null;
          target_ids: string[] | null;
          action_details: any | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id?: string | null;
          action_type: string;
          target_type: string;
          target_id?: string | null;
          target_ids?: string[] | null;
          action_details?: any | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string | null;
          action_type?: string;
          target_type?: string;
          target_id?: string | null;
          target_ids?: string[] | null;
          action_details?: any | null;
          created_at?: string;
        };
      };
    };
  };
}