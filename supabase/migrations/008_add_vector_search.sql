-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to experience_records table
-- Using 1536 dimensions for OpenAI text-embedding-3-small model
-- You can adjust the dimension based on your embedding model
ALTER TABLE experience_records 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create HNSW index for efficient vector similarity search
-- Using cosine distance operator (<->) for semantic similarity
CREATE INDEX IF NOT EXISTS idx_experience_records_embedding 
ON experience_records 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64)
WHERE status = 'published' AND embedding IS NOT NULL;

-- Create function for vector similarity search
CREATE OR REPLACE FUNCTION match_experiences_by_embedding(
    query_embedding vector(1536),
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

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION match_experiences_by_embedding(vector(1536), float, int) TO anon;
GRANT EXECUTE ON FUNCTION match_experiences_by_embedding(vector(1536), float, int) TO authenticated;

-- Create function to generate embedding from text
-- Note: This is a placeholder. In practice, you would call an embedding API
-- (like OpenAI, Cohere, etc.) from your application code, not from SQL
CREATE OR REPLACE FUNCTION update_experience_embedding(
    experience_id uuid,
    embedding_vector vector(1536)
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

GRANT EXECUTE ON FUNCTION update_experience_embedding(uuid, vector(1536)) TO anon;
GRANT EXECUTE ON FUNCTION update_experience_embedding(uuid, vector(1536)) TO authenticated;

