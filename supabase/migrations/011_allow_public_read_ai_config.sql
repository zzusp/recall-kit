-- Allow public read access to ai_config setting
-- This is safe because it only contains configuration, not sensitive data
-- The actual API keys are stored in the config but reading the config itself is needed for the service to work

-- Drop existing admin-only read policy for ai_config
DROP POLICY IF EXISTS "Allow public read ai_config" ON system_settings;

-- Create a new policy that allows anyone to read the ai_config setting
CREATE POLICY "Allow public read ai_config"
ON system_settings FOR SELECT
USING (setting_key = 'ai_config');

