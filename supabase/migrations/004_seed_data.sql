-- Create first admin user (system initialization)
-- This should be run after setting up Supabase Auth

-- Insert first admin profile (assuming auth.users already has the user)
-- Replace 'first-admin-uuid' with the actual UUID from auth.users
INSERT INTO profiles (id, username, email, role, created_at, updated_at)
VALUES (
  'first-admin-uuid', -- Replace with actual UUID from auth.users
  'admin',
  'admin@example.com', 
  'admin',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE 
SET role = 'admin', updated_at = NOW();

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