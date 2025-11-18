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

-- Create new users table to replace profiles
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

-- Update experience_records to reference new users table instead of profiles
ALTER TABLE experience_records 
DROP CONSTRAINT IF EXISTS experience_records_user_id_fkey,
ADD CONSTRAINT experience_records_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Update admin_actions to reference new users table instead of profiles
ALTER TABLE admin_actions 
DROP CONSTRAINT IF EXISTS admin_actions_admin_id_fkey,
ADD CONSTRAINT admin_actions_admin_id_fkey 
FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL;

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

-- Create indexes for better performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);