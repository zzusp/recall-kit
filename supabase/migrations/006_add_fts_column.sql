-- Add generated tsvector column for full-text search
-- This column is required for Supabase's textSearch() method

ALTER TABLE experience_records 
ADD COLUMN IF NOT EXISTS fts tsvector 
GENERATED ALWAYS AS (
  to_tsvector('english',
    COALESCE(title, '') || ' ' || 
    COALESCE(problem_description, '') || ' ' || 
    COALESCE(root_cause, '') || ' ' || 
    COALESCE(solution, '') || ' ' || 
    COALESCE(context, '')
  )
) STORED;

-- Create GIN index on the fts column for fast full-text search
CREATE INDEX IF NOT EXISTS idx_experience_records_fts 
ON experience_records 
USING GIN (fts);

-- Drop the old index that used the function expression (if it exists)
-- The new index on the fts column is more efficient
DROP INDEX IF EXISTS idx_experience_records_search;

