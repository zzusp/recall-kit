-- Create superuser account
-- Default credentials: username='admin', password='admin123'

-- Insert superuser
INSERT INTO public.users (
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
  '$2a$10$IfV1yqANN8ledqbKlBc.y.j1kecXJnZJaQIuNjxIy8CMJk0oEu0E6', -- TODO: In production, use proper password hashing (bcrypt)
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (username) DO NOTHING;

-- Assign superuser role to the admin user
INSERT INTO public.user_roles (
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
FROM public.users u
CROSS JOIN public.roles r
WHERE u.username = 'admin' 
  AND r.name = 'superuser'
ON CONFLICT DO NOTHING;

-- Grant all existing permissions to superuser role (in case some permissions were added after role creation)
INSERT INTO public.role_permissions (
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
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'superuser'
ON CONFLICT (role_id, permission_id) DO NOTHING;