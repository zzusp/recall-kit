-- Add API key column for storing complete keys temporarily
ALTER TABLE api_keys 
ADD COLUMN api_key TEXT;

-- Add comment to explain purpose
COMMENT ON COLUMN api_keys.api_key IS 'Stores complete API key temporarily for copy functionality. Should be cleared after copying for security.';

-- Add index for performance (optional)
CREATE INDEX idx_api_keys_api_key ON api_keys(api_key) WHERE api_key IS NOT NULL;