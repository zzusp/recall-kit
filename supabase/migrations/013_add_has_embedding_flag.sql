-- Add has_embedding flag to experience_records table
-- This flag indicates whether the experience has been vectorized
-- This avoids querying the large embedding vector field just to check if it exists

ALTER TABLE experience_records 
ADD COLUMN IF NOT EXISTS has_embedding BOOLEAN NOT NULL DEFAULT false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_experience_records_has_embedding 
ON experience_records(has_embedding) 
WHERE has_embedding = true;

-- Update existing records: set has_embedding = true where embedding IS NOT NULL
UPDATE experience_records
SET has_embedding = true
WHERE embedding IS NOT NULL;

-- Update the update_experience_embedding function to also set has_embedding flag
CREATE OR REPLACE FUNCTION update_experience_embedding(
    experience_id uuid,
    embedding_vector vector(1024)
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE experience_records
    SET embedding = embedding_vector,
        has_embedding = true,
        updated_at = NOW()
    WHERE id = experience_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_experience_embedding(uuid, vector(1024)) TO anon;
GRANT EXECUTE ON FUNCTION update_experience_embedding(uuid, vector(1024)) TO authenticated;

