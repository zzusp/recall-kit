-- Add review fields to experience_records table
-- This migration adds content review functionality

-- Add review-related columns to experience_records
ALTER TABLE experience_records 
ADD COLUMN review_status VARCHAR(20) NOT NULL DEFAULT 'pending',
ADD COLUMN reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN reviewed_at TIMESTAMPTZ,
ADD COLUMN review_note TEXT;

-- Add indexes for review fields
CREATE INDEX idx_experience_records_review_status ON experience_records(review_status);
CREATE INDEX idx_experience_records_reviewed_at ON experience_records(reviewed_at DESC);

-- Add comment to explain the review statuses
COMMENT ON COLUMN experience_records.review_status IS 'Review status: pending, approved, rejected';
COMMENT ON COLUMN experience_records.reviewed_by IS 'ID of the admin who reviewed this experience';
COMMENT ON COLUMN experience_records.reviewed_at IS 'Timestamp when the experience was reviewed';
COMMENT ON COLUMN experience_records.review_note IS 'Note from the reviewer explaining the decision';

-- Update existing records to set review_status based on current status
UPDATE experience_records 
SET review_status = CASE 
    WHEN status = 'published' AND is_deleted = false THEN 'approved'
    WHEN is_deleted = true THEN 'rejected'
    ELSE 'pending'
END;

-- Note: Status updates will be handled in application code instead of triggers
-- to provide better control and avoid potential issues with automated updates

-- Add new permissions for review functionality (only if they don't exist)
INSERT INTO permissions (name, resource, action, description) VALUES
('experiences.review', 'experiences', 'review', 'Review and approve/reject experiences'),
('experiences.review_pending', 'experiences', 'review_pending', 'View pending reviews'),
('experiences.batch_review', 'experiences', 'batch_review', 'Batch approve/reject experiences')
ON CONFLICT (name) DO NOTHING;

-- Assign review permissions to admin and editor roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name IN ('admin', 'editor') 
AND p.name IN ('experiences.review', 'experiences.review_pending', 'experiences.batch_review')
ON CONFLICT (role_id, permission_id) DO NOTHING;