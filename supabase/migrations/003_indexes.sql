-- Create indexes for performance optimization

-- profiles table indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_created_at ON profiles(created_at DESC);

-- experience_records table indexes
CREATE INDEX idx_experience_records_status ON experience_records(status) WHERE status = 'published';
CREATE INDEX idx_experience_records_created_at ON experience_records(created_at DESC);
CREATE INDEX idx_experience_records_query_count ON experience_records(query_count DESC);
CREATE INDEX idx_experience_records_relevance_score ON experience_records(relevance_score DESC);
CREATE INDEX idx_experience_records_user_id ON experience_records(user_id);

-- Full-text search index for experience_records
CREATE INDEX idx_experience_records_search ON experience_records 
USING GIN (to_tsvector('english', 
  COALESCE(title, '') || ' ' || 
  COALESCE(problem_description, '') || ' ' || 
  COALESCE(root_cause, '') || ' ' || 
  COALESCE(solution, '') || ' ' || 
  COALESCE(context, '')
));

-- experience_keywords table indexes
CREATE INDEX idx_experience_keywords_experience_id ON experience_keywords(experience_id);
CREATE INDEX idx_experience_keywords_keyword ON experience_keywords(keyword);

-- query_logs table indexes
CREATE INDEX idx_query_logs_created_at ON query_logs(created_at DESC);
CREATE INDEX idx_query_logs_query_source ON query_logs(query_source);

-- submission_logs table indexes
CREATE INDEX idx_submission_logs_experience_id ON submission_logs(experience_id);
CREATE INDEX idx_submission_logs_created_at ON submission_logs(created_at DESC);
CREATE INDEX idx_submission_logs_status ON submission_logs(submission_status);

-- admin_actions table indexes
CREATE INDEX idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_created_at ON admin_actions(created_at DESC);
CREATE INDEX idx_admin_actions_action_type ON admin_actions(action_type);