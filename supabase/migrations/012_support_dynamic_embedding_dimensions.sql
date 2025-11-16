-- Support dynamic embedding dimensions for different AI models
-- Using 1024 dimensions for BAAI/bge-m3 and other 1024-dimension models

-- Drop the existing index (will recreate it after column change)
DROP INDEX IF EXISTS idx_experience_records_embedding;

-- Drop the old column with fixed dimensions (no data to preserve)
ALTER TABLE experience_records 
DROP COLUMN IF EXISTS embedding;

-- Add new column with 1024 dimensions to match the embedding model
ALTER TABLE experience_records 
ADD COLUMN embedding vector(1024);

-- Recreate the HNSW index with 1024 dimensions
CREATE INDEX IF NOT EXISTS idx_experience_records_embedding 
ON experience_records 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64)
WHERE status = 'published' AND embedding IS NOT NULL;

-- Update the vector similarity search function to accept 1024-dimension vectors
CREATE OR REPLACE FUNCTION match_experiences_by_embedding(
    query_embedding vector(1024),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id uuid,
    title varchar(500),
    problem_description text,
    root_cause text,
    solution text,
    context text,
    status varchar(20),
    query_count integer,
    view_count integer,
    relevance_score float,
    similarity float,
    created_at timestamptz,
    updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        er.id,
        er.title,
        er.problem_description,
        er.root_cause,
        er.solution,
        er.context,
        er.status,
        er.query_count,
        er.view_count,
        er.relevance_score,
        1 - (er.embedding <=> query_embedding) as similarity,
        er.created_at,
        er.updated_at
    FROM experience_records er
    WHERE er.status = 'published'
        AND er.embedding IS NOT NULL
        AND 1 - (er.embedding <=> query_embedding) > match_threshold
    ORDER BY er.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Update the update_experience_embedding function to accept 1024-dimension vectors
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
        updated_at = NOW()
    WHERE id = experience_id;
END;
$$;

-- Grant execute permissions (updated function signatures)
GRANT EXECUTE ON FUNCTION match_experiences_by_embedding(vector(1024), float, int) TO anon;
GRANT EXECUTE ON FUNCTION match_experiences_by_embedding(vector(1024), float, int) TO authenticated;
GRANT EXECUTE ON FUNCTION update_experience_embedding(uuid, vector(1024)) TO anon;
GRANT EXECUTE ON FUNCTION update_experience_embedding(uuid, vector(1024)) TO authenticated;

