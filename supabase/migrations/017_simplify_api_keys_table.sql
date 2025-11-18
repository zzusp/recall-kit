-- Remove description and expires_at columns from api_keys table
ALTER TABLE api_keys 
DROP COLUMN IF EXISTS description,
DROP COLUMN IF EXISTS expires_at;

-- Update indexes to remove expires_at index if it exists
DROP INDEX IF EXISTS idx_api_keys_expires_at;

-- Note: The updated_at timestamp will continue to be controlled by application code
-- The application should update this field when making changes to records

-- Update table comment
COMMENT ON TABLE api_keys IS 'Stores simplified API keys for users to access the system programmatically';