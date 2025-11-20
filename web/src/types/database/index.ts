// 数据库类型定义的主入口文件

// 导入认证相关类型
export * from './auth';

// 导入经验相关类型
export * from './experience';

// 导出完整的数据库接口定义（保持向后兼容）
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          email: string;
          password_hash: string;
          is_active: boolean;
          is_superuser: boolean;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          username: string;
          email: string;
          password_hash: string;
          is_active?: boolean;
          is_superuser?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          email?: string;
          password_hash?: string;
          is_active?: boolean;
          is_superuser?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      api_keys: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          api_key: string;
          is_active: boolean;
          last_used_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          api_key: string;
          is_active?: boolean;
          last_used_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          api_key?: string;
          is_active?: boolean;
          last_used_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      api_key_usage_logs: {
        Row: {
          id: string;
          api_key_id: string;
          endpoint: string;
          method: string;
          ip_address: string | null;
          user_agent: string | null;
          status_code: number | null;
          response_time_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          api_key_id: string;
          endpoint: string;
          method: string;
          ip_address?: string | null;
          user_agent?: string | null;
          status_code?: number | null;
          response_time_ms?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          api_key_id?: string;
          endpoint?: string;
          method?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          status_code?: number | null;
          response_time_ms?: number | null;
          created_at?: string;
        };
      };
      roles: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_system_role: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          is_system_role?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          is_system_role?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      permissions: {
        Row: {
          id: string;
          name: string;
          resource: string;
          action: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          resource: string;
          action: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          resource?: string;
          action?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role_id?: string;
          created_at?: string;
        };
      };
      role_permissions: {
        Row: {
          id: string;
          role_id: string;
          permission_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          role_id: string;
          permission_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          role_id?: string;
          permission_id?: string;
          created_at?: string;
        };
      };
      user_sessions: {
        Row: {
          id: string;
          user_id: string;
          session_token: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_token: string;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_token?: string;
          expires_at?: string;
          created_at?: string;
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
          publish_status: 'published' | 'draft';
          review_status: 'approved';
          reviewed_by: string | null;
          reviewed_at: string | null;
          review_note: string | null;
          is_deleted: boolean;
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
          publish_status?: 'published' | 'draft';
          review_status?: 'approved';
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_note?: string | null;
          is_deleted?: boolean;
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
          publish_status?: 'published' | 'draft';
          review_status?: 'approved';
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          review_note?: string | null;
          is_deleted?: boolean;
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