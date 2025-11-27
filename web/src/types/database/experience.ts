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
