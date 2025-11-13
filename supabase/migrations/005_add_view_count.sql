-- Add view_count column to experience_records table
ALTER TABLE experience_records 
ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

-- Create index for view_count for better performance in sorting
CREATE INDEX IF NOT EXISTS idx_experience_records_view_count 
ON experience_records(view_count DESC) 
WHERE status = 'published';

-- Update existing records to have view_count = query_count as a starting point
UPDATE experience_records 
SET view_count = query_count 
WHERE view_count = 0 OR view_count IS NULL;