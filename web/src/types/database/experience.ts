// 经验相关的数据库类型定义

export interface ExperienceRecord {
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
  deleted_at: string | null; // Keep for backward compatibility
}

export interface ExperienceKeyword {
  id: string;
  experience_id: string;
  keyword: string;
  created_at: string;
}

export interface QueryLog {
  id: string;
  query_keywords: string;
  result_count: number;
  response_time_ms: number | null;
  experience_ids: string[] | null;
  query_source: string;
  created_at: string;
}

export interface AdminAction {
  id: string;
  admin_id: string | null;
  action_type: string;
  target_type: string;
  target_id: string | null;
  target_ids: string[] | null;
  action_details: any | null;
  created_at: string;
}