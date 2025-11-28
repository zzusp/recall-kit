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
  fts: string | null;
  embedding: number[] | null;
  has_embedding: boolean;
  keywords: string[]; // 关键字数组，已从 experience_keywords 表迁移到此字段
  created_at: string;
  updated_at: string;
  deleted_at: string | null; // Keep for backward compatibility
}

/**
 * @deprecated 经验关键字已合并到 experience_records.keywords 字段，此接口保留仅用于向后兼容
 */
export interface ExperienceKeyword {
  id: string;
  experience_id: string;
  keyword: string;
  created_at: string;
}
