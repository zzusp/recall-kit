-- Add missing INSERT policy for experience_keywords table
-- This allows anonymous users to insert keywords when creating experience records

CREATE POLICY "Allow anonymous users to insert keywords"
ON experience_keywords FOR INSERT
WITH CHECK (true);

