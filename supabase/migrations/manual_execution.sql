-- 手动执行API密钥表创建
-- 请在数据库中直接执行以下SQL语句

-- 1. 创建API密钥表
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  key_prefix VARCHAR(10) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 创建API密钥使用日志表
CREATE TABLE api_key_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  status_code INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. 创建性能优化索引
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at);
CREATE INDEX idx_api_key_usage_logs_api_key_id ON api_key_usage_logs(api_key_id);
CREATE INDEX idx_api_key_usage_logs_created_at ON api_key_usage_logs(created_at);

-- 4. 添加表注释（可选）
COMMENT ON TABLE api_keys IS 'Stores API keys for users to access system programmatically';
COMMENT ON TABLE api_key_usage_logs IS 'Stores usage logs for API keys with endpoint and performance data';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA256 hash of the actual API key for security';
COMMENT ON COLUMN api_keys.key_prefix IS 'First 10 characters of the API key for identification';
COMMENT ON COLUMN api_key_usage_logs.ip_address IS 'IP address of the API request';
COMMENT ON COLUMN api_key_usage_logs.response_time_ms IS 'Response time in milliseconds';

-- 5. 验证表是否创建成功
SELECT 'api_keys table created successfully' as status WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'api_keys'
);

SELECT 'api_key_usage_logs table created successfully' as status WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'api_key_usage_logs'
);