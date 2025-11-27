-- 删除审核功能相关的数据库字段和索引
-- 执行此脚本前请确保已备份数据库

BEGIN;

-- 删除外键约束
ALTER TABLE experience_records DROP CONSTRAINT IF EXISTS experience_records_reviewed_by_fkey;

-- 删除索引
DROP INDEX IF EXISTS idx_experience_records_review_status;
DROP INDEX IF EXISTS idx_experience_records_reviewed_at;
DROP INDEX IF EXISTS idx_experience_records_reviewed_by;

-- 删除审核相关字段
ALTER TABLE experience_records DROP COLUMN IF EXISTS review_status;
ALTER TABLE experience_records DROP COLUMN IF EXISTS reviewed_by;
ALTER TABLE experience_records DROP COLUMN IF EXISTS reviewed_at;
ALTER TABLE experience_records DROP COLUMN IF EXISTS review_note;

COMMIT;

