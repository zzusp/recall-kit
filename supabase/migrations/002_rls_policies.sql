-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- profiles table policies
CREATE POLICY "Allow users to read their own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Allow admins to read all profiles"
ON profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY "Allow users to update their own profile (except role)"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND role IS NULL);

CREATE POLICY "Allow admins to update any profile"
ON profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- experience_records policies
CREATE POLICY "Allow all users to read published experiences"
ON experience_records FOR SELECT
USING (status = 'published');

CREATE POLICY "Allow anonymous users to create experiences"
ON experience_records FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow admins to read all experiences"
ON experience_records FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY "Allow admins to update experiences"
ON experience_records FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

CREATE POLICY "Allow admins to delete experiences"
ON experience_records FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- experience_keywords policies
CREATE POLICY "Allow all users to read keywords"
ON experience_keywords FOR SELECT
USING (true);

CREATE POLICY "Allow anonymous users to insert keywords"
ON experience_keywords FOR INSERT
WITH CHECK (true);

-- query_logs policies
CREATE POLICY "Allow admins to read query logs"
ON query_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- submission_logs policies
CREATE POLICY "Allow admins to read submission logs"
ON submission_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- admin_actions policies
CREATE POLICY "Allow admins to read admin actions"
ON admin_actions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);