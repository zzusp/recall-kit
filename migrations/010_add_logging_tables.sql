-- API密钥验证日志表
CREATE TABLE IF NOT EXISTS api_key_validation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    api_key_prefix VARCHAR(20),
    validation_result VARCHAR(20) NOT NULL, -- 'success' or 'failed'
    failure_reason TEXT,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 为现有表添加新字段（如果不存在）
ALTER TABLE query_logs 
ADD COLUMN IF NOT EXISTS api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS session_id VARCHAR(255);

ALTER TABLE submission_logs 
ADD COLUMN IF NOT EXISTS api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS session_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS title VARCHAR(500),
ADD COLUMN IF NOT EXISTS problem_description TEXT;

-- 创建索引以优化查询性能
CREATE INDEX IF NOT EXISTS idx_api_key_validation_logs_created_at ON api_key_validation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_key_validation_logs_result ON api_key_validation_logs(validation_result);
CREATE INDEX IF NOT EXISTS idx_api_key_validation_logs_key_id ON api_key_validation_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_validation_logs_user_id ON api_key_validation_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_query_logs_created_at ON query_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_query_logs_api_key_id ON query_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_query_logs_user_id ON query_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_submission_logs_created_at ON submission_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_submission_logs_api_key_id ON submission_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_submission_logs_user_id ON submission_logs(user_id);