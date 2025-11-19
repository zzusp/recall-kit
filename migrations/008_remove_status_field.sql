-- Remove the deprecated status field from experience_records table
-- This migration completes the transition to the new status system

-- Remove the deprecated status field
ALTER TABLE experience_records DROP COLUMN IF EXISTS status;

-- Update indexes that were still using the old status field
DROP INDEX IF EXISTS idx_experience_records_status;

-- Update vector search index to ensure it doesn't reference the removed status field
DROP INDEX IF EXISTS idx_experience_records_embedding;
CREATE INDEX idx_experience_records_embedding 
ON experience_records 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64)
WHERE publish_status = 'published' AND is_deleted = false AND embedding IS NOT NULL;

-- Create a new proper index for published experiences
CREATE INDEX idx_experience_records_published 
ON experience_records (publish_status, is_deleted) 
WHERE publish_status = 'published' AND is_deleted = false;

-- Update comment to document the new status system
COMMENT ON TABLE experience_records IS 'Experience records with unified status system using publish_status, review_status, and is_deleted fields';
COMMENT ON COLUMN experience_records.publish_status IS 'Publication status: draft, publishing, published, rejected';
COMMENT ON COLUMN experience_records.review_status IS 'Review status: pending, approved, rejected';
COMMENT ON COLUMN experience_records.is_deleted IS 'Soft delete flag: false = active, true = deleted';
