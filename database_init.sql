-- PostgreSQL Database Initialization Script
-- Generated from supabase migrations, converted to standard PostgreSQL

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Create independent user authentication and authorization system

-- Create roles table
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  is_system_role BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create permissions table
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_permission UNIQUE (resource, action)
);

-- Create role_permissions junction table
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_role_permission UNIQUE (role_id, permission_id)
);

-- Create users table (replaces profiles table)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_superuser BOOLEAN DEFAULT false,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_roles junction table
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_role UNIQUE (user_id, role_id)
);

-- Create user_sessions table for session management
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create experience_records table
CREATE TABLE experience_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  problem_description TEXT NOT NULL,
  root_cause TEXT,
  solution TEXT NOT NULL,
  context TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'published',
  query_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  relevance_score FLOAT DEFAULT 0.0,
  fts tsvector GENERATED ALWAYS AS (
    to_tsvector('english',
      COALESCE(title, '') || ' ' || 
      COALESCE(problem_description, '') || ' ' || 
      COALESCE(root_cause, '') || ' ' || 
      COALESCE(solution, '') || ' ' || 
      COALESCE(context, '')
    )
  ) STORED,
  embedding vector(1024),
  has_embedding BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Create experience_keywords table
CREATE TABLE experience_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experience_id UUID REFERENCES experience_records(id) ON DELETE CASCADE,
  keyword VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_experience_keyword UNIQUE (experience_id, keyword)
);

-- Create query_logs table
CREATE TABLE query_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query_keywords TEXT NOT NULL,
  result_count INTEGER NOT NULL DEFAULT 0,
  response_time_ms INTEGER,
  experience_ids UUID[],
  query_source VARCHAR(50) NOT NULL DEFAULT 'mcp',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create submission_logs table
CREATE TABLE submission_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  experience_id UUID REFERENCES experience_records(id) ON DELETE SET NULL,
  submission_status VARCHAR(20) NOT NULL,
  error_message TEXT,
  validation_errors JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create admin_actions table
CREATE TABLE admin_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action_type VARCHAR(50) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id UUID,
  target_ids UUID[],
  action_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create system_settings table for storing AI configuration and other system settings
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance optimization
-- users table indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- user_sessions table indexes
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- user_roles table indexes
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

-- role_permissions table indexes
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

-- experience_records table indexes
CREATE INDEX idx_experience_records_status ON experience_records(status) WHERE status = 'published';
CREATE INDEX idx_experience_records_created_at ON experience_records(created_at DESC);
CREATE INDEX idx_experience_records_query_count ON experience_records(query_count DESC);
CREATE INDEX idx_experience_records_view_count ON experience_records(view_count DESC) WHERE status = 'published';
CREATE INDEX idx_experience_records_relevance_score ON experience_records(relevance_score DESC);
CREATE INDEX idx_experience_records_user_id ON experience_records(user_id);
CREATE INDEX idx_experience_records_has_embedding ON experience_records(has_embedding) WHERE has_embedding = true;

-- Full-text search indexes for experience_records
CREATE INDEX idx_experience_records_fts ON experience_records USING GIN (fts);
CREATE INDEX idx_experience_records_search ON experience_records 
USING GIN (to_tsvector('english', 
  COALESCE(title, '') || ' ' || 
  COALESCE(problem_description, '') || ' ' || 
  COALESCE(root_cause, '') || ' ' || 
  COALESCE(solution, '') || ' ' || 
  COALESCE(context, '')
));

-- Vector search index for experience_records
CREATE INDEX idx_experience_records_embedding 
ON experience_records 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64)
WHERE status = 'published' AND embedding IS NOT NULL;

-- experience_keywords table indexes
CREATE INDEX idx_experience_keywords_experience_id ON experience_keywords(experience_id);
CREATE INDEX idx_experience_keywords_keyword ON experience_keywords(keyword);

-- query_logs table indexes
CREATE INDEX idx_query_logs_created_at ON query_logs(created_at DESC);
CREATE INDEX idx_query_logs_query_source ON query_logs(query_source);

-- submission_logs table indexes
CREATE INDEX idx_submission_logs_experience_id ON submission_logs(experience_id);
CREATE INDEX idx_submission_logs_created_at ON submission_logs(created_at DESC);
CREATE INDEX idx_submission_logs_status ON submission_logs(submission_status);

-- admin_actions table indexes
CREATE INDEX idx_admin_actions_admin_id ON admin_actions(admin_id);
CREATE INDEX idx_admin_actions_created_at ON admin_actions(created_at DESC);
CREATE INDEX idx_admin_actions_action_type ON admin_actions(action_type);

-- system_settings table indexes
CREATE INDEX idx_system_settings_key ON system_settings(setting_key);

-- Create functions
-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_view_count(experience_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
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

-- Function for vector similarity search
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

-- Function to update experience embedding
CREATE OR REPLACE FUNCTION update_experience_embedding(
    experience_id uuid,
    embedding_vector vector(1024)
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE experience_records
  SET embedding = embedding_vector,
      has_embedding = true,
      updated_at = NOW()
  WHERE id = experience_id;
END;
$$;

-- Function to automatically update updated_at timestamp for system_settings
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_updated_at();

-- Insert default data
-- Insert default system roles
INSERT INTO roles (name, description, is_system_role) VALUES
('superuser', 'Superuser with all permissions', true),
('admin', 'Administrator with most permissions', true),
('editor', 'Content editor with limited permissions', true),
('user', 'Regular user with basic permissions', true),
('guest', 'Guest user with minimal permissions', true);

-- Insert default permissions
INSERT INTO permissions (name, resource, action, description) VALUES
-- User management permissions
('users.view', 'users', 'view', 'View user list and details'),
('users.create', 'users', 'create', 'Create new users'),
('users.edit', 'users', 'edit', 'Edit existing users'),
('users.delete', 'users', 'delete', 'Delete users'),
('users.activate', 'users', 'activate', 'Activate/deactivate users'),

-- Role management permissions
('roles.view', 'roles', 'view', 'View role list and details'),
('roles.create', 'roles', 'create', 'Create new roles'),
('roles.edit', 'roles', 'edit', 'Edit existing roles'),
('roles.delete', 'roles', 'delete', 'Delete roles'),

-- Permission management permissions
('permissions.view', 'permissions', 'view', 'View permission list'),
('permissions.assign', 'permissions', 'assign', 'Assign permissions to roles'),

-- Experience management permissions
('experiences.view', 'experiences', 'view', 'View experiences'),
('experiences.create', 'experiences', 'create', 'Create new experiences'),
('experiences.edit', 'experiences', 'edit', 'Edit own experiences'),
('experiences.edit_any', 'experiences', 'edit_any', 'Edit any experiences'),
('experiences.delete', 'experiences', 'delete', 'Delete own experiences'),
('experiences.delete_any', 'experiences', 'delete_any', 'Delete any experiences'),
('experiences.publish', 'experiences', 'publish', 'Publish experiences'),
('experiences.review', 'experiences', 'review', 'Review and approve experiences'),

-- Admin permissions
('admin.dashboard', 'admin', 'dashboard', 'Access admin dashboard'),
('admin.settings', 'admin', 'settings', 'Manage system settings'),
('admin.logs', 'admin', 'logs', 'View system logs');

-- Assign permissions to roles
-- Superuser gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'superuser';

-- Admin gets most permissions except user deletion
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'admin' 
AND p.name NOT IN ('users.delete');

-- Editor gets content management permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'editor' 
AND p.name IN ('experiences.view', 'experiences.create', 'experiences.edit', 'experiences.delete', 'experiences.publish');

-- User gets basic permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'user' 
AND p.name IN ('experiences.view', 'experiences.create', 'experiences.edit', 'experiences.delete');

-- Guest gets view-only permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'guest' 
AND p.name IN ('experiences.view');

-- Create superuser account
-- Default credentials: username='admin', password='admin123'
INSERT INTO users (
  id,
  username,
  email,
  password_hash,
  is_active,
  is_superuser,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'admin',
  'admin@example.com',
  '$2a$10$SHxaHwGyix3SOLWoocthTOotxFe7LUUgY8zRXSqRFPVL7JJCCs6Hy', -- TODO: In production, use proper password hashing (bcrypt)
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (username) DO NOTHING;

-- Assign superuser role to the admin user
INSERT INTO user_roles (
  id,
  user_id,
  role_id,
  created_at
) 
SELECT 
  gen_random_uuid(),
  u.id,
  r.id,
  NOW()
FROM users u
CROSS JOIN roles r
WHERE u.username = 'admin' 
  AND r.name = 'superuser'
ON CONFLICT DO NOTHING;

-- Grant all existing permissions to superuser role (in case some permissions were added after role creation)
INSERT INTO role_permissions (
  id,
  role_id,
  permission_id,
  created_at
)
SELECT 
  gen_random_uuid(),
  r.id,
  p.id,
  NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'superuser'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Insert sample experience records for testing
INSERT INTO experience_records (title, problem_description, root_cause, solution, context, status, query_count, relevance_score)
VALUES 
(
  'Next.js API Route CORS Issue',
  'When making requests to Next.js API routes from external domains, getting CORS errors',
  'Next.js API routes don''t have CORS headers configured by default',
  'Add CORS headers to the API route response or use a middleware like next-connect with cors',
  '// Example of adding CORS headers in Next.js API route\nimport { NextApiRequest, NextApiResponse } from ''next'';\n\nexport default function handler(req: NextApiRequest, res: NextApiResponse) {\n  res.setHeader(''Access-Control-Allow-Origin'', ''*'');\n  res.setHeader(''Access-Control-Allow-Methods'', ''GET, POST, PUT, DELETE, OPTIONS'');\n  res.setHeader(''Access-Control-Allow-Headers'', ''Content-Type, Authorization'');\n  \n  if (req.method === ''OPTIONS'') {\n    return res.status(200).end();\n  }\n  \n  // Your API logic here\n  res.status(200).json({ message: ''Hello World'' });\n}',
  'published',
  15,
  0.85
),
(
  'TypeScript Type Narrowing Issue',
  'TypeScript not properly narrowing types in conditional statements',
  'Type guards need to be explicit for complex types',
  'Use explicit type guards or type predicates to help TypeScript understand the type narrowing',
  '// Example of type predicate\ninterface Cat { meow(): void; }\ninterface Dog { bark(): void; }\n\nfunction isCat(animal: Cat | Dog): animal is Cat {\n  return (animal as Cat).meow !== undefined;\n}\n\nfunction handleAnimal(animal: Cat | Dog) {\n  if (isCat(animal)) {\n    animal.meow(); // TypeScript knows this is a Cat\n  } else {\n    animal.bark(); // TypeScript knows this is a Dog\n  }\n}',
  'published',
  8,
  0.92
);

-- Insert keywords for the sample experiences
INSERT INTO experience_keywords (experience_id, keyword)
SELECT id, unnest(ARRAY['nextjs', 'cors', 'api', 'headers', 'middleware'])
FROM experience_records WHERE title = 'Next.js API Route CORS Issue';

INSERT INTO experience_keywords (experience_id, keyword)
SELECT id, unnest(ARRAY['typescript', 'type-narrowing', 'type-guards', 'type-predicates'])
FROM experience_records WHERE title = 'TypeScript Type Narrowing Issue';

-- Initialize view_count for existing records
UPDATE experience_records 
SET view_count = query_count 
WHERE view_count = 0 OR view_count IS NULL;