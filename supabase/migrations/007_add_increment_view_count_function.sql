-- Create function to atomically increment view_count
-- This ensures thread-safe updates and better performance

CREATE OR REPLACE FUNCTION increment_view_count(experience_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE experience_records
  SET 
    view_count = view_count + 1,
    updated_at = NOW()
  WHERE id = experience_id
    AND status = 'published'
  RETURNING view_count INTO new_count;
  
  RETURN COALESCE(new_count, 0);
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION increment_view_count(UUID) TO anon;
GRANT EXECUTE ON FUNCTION increment_view_count(UUID) TO authenticated;

