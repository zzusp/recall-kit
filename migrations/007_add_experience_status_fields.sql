-- Add publish_status and review_status fields to experience_records table
-- These fields replace the simple status field for better workflow management

-- Add publish_status field if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'experience_records' 
                   AND column_name = 'publish_status') THEN
        ALTER TABLE experience_records 
        ADD COLUMN publish_status VARCHAR(20) NOT NULL DEFAULT 'draft';
    END IF;
END $$;

-- Add review_status field if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'experience_records' 
                   AND column_name = 'review_status') THEN
        ALTER TABLE experience_records 
        ADD COLUMN review_status VARCHAR(20) NOT NULL DEFAULT 'pending';
    END IF;
END $$;

-- Add reviewed_by field if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'experience_records' 
                   AND column_name = 'reviewed_by') THEN
        ALTER TABLE experience_records 
        ADD COLUMN reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add reviewed_at field if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'experience_records' 
                   AND column_name = 'reviewed_at') THEN
        ALTER TABLE experience_records 
        ADD COLUMN reviewed_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add review_note field if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'experience_records' 
                   AND column_name = 'review_note') THEN
        ALTER TABLE experience_records 
        ADD COLUMN review_note TEXT;
    END IF;
END $$;

-- Add is_deleted field if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'experience_records' 
                   AND column_name = 'is_deleted') THEN
        ALTER TABLE experience_records 
        ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Update existing records to set appropriate default values
UPDATE experience_records 
SET 
    publish_status = CASE 
        WHEN status = 'published' THEN 'published'
        ELSE 'draft'
    END,
    review_status = CASE 
        WHEN status = 'published' THEN 'approved'
        ELSE 'pending'
    END,
    is_deleted = false
WHERE publish_status IS NULL OR review_status IS NULL;

-- Create indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_experience_records_publish_status ON experience_records(publish_status);
CREATE INDEX IF NOT EXISTS idx_experience_records_review_status ON experience_records(review_status);
CREATE INDEX IF NOT EXISTS idx_experience_records_reviewed_by ON experience_records(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_experience_records_reviewed_at ON experience_records(reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_experience_records_is_deleted ON experience_records(is_deleted);

-- Update the existing status index to include new filtering logic
DROP INDEX IF EXISTS idx_experience_records_status;
CREATE INDEX idx_experience_records_status ON experience_records(publish_status) 
WHERE publish_status = 'published' AND is_deleted = false;

-- Update vector search index to use new fields
DROP INDEX IF EXISTS idx_experience_records_embedding;
CREATE INDEX idx_experience_records_embedding 
ON experience_records 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64)
WHERE publish_status = 'published' AND is_deleted = false AND embedding IS NOT NULL;
