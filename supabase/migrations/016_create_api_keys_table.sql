-- Create API keys table
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

-- Create API key usage logs table
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

-- Create indexes for better performance
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at);
CREATE INDEX idx_api_key_usage_logs_api_key_id ON api_key_usage_logs(api_key_id);
CREATE INDEX idx_api_key_usage_logs_created_at ON api_key_usage_logs(created_at);

-- Note: Row Level Security (RLS) policies are removed as this is not a Supabase environment
-- Security should be implemented at the application layer through proper user authentication
-- and authorization checks in the backend code

-- Note: updated_at timestamp will be controlled by application code
-- The application should update this field when making changes to records

-- Comment for developers
COMMENT ON TABLE api_keys IS 'Stores API keys for users to access the system programmatically';
COMMENT ON TABLE api_key_usage_logs IS 'Stores usage logs for API keys with endpoint and performance data';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA256 hash of the actual API key for security';
COMMENT ON COLUMN api_keys.key_prefix IS 'First 10 characters of the API key for identification';
COMMENT ON COLUMN api_key_usage_logs.ip_address IS 'IP address of the API request';
COMMENT ON COLUMN api_key_usage_logs.response_time_ms IS 'Response time in milliseconds';