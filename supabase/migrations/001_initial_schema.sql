-- Create tables based on data-model.md specifications

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  CONSTRAINT unique_username UNIQUE (username),
  CONSTRAINT unique_email UNIQUE (email)
);

-- Create experience_records table
CREATE TABLE experience_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  problem_description TEXT NOT NULL,
  root_cause TEXT,
  solution TEXT NOT NULL,
  context TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'published',
  query_count INTEGER NOT NULL DEFAULT 0,
  relevance_score FLOAT DEFAULT 0.0,
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
  admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action_type VARCHAR(50) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id UUID,
  target_ids UUID[],
  action_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);