import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    // Build WHERE clause for search
    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause = 'WHERE username ILIKE $1 OR email ILIKE $1';
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get users with roles
    const usersResult = await db.query(`
      SELECT u.id, u.username, u.email, u.is_active, u.is_superuser, 
             u.created_at, u.updated_at, u.last_login_at,
             COALESCE(
               json_agg(
                 CASE WHEN r.id IS NOT NULL THEN 
                   jsonb_build_object('id', r.id, 'name', r.name, 'description', r.description, 'is_system_role', r.is_system_role)
                 END
               ) FILTER (WHERE r.id IS NOT NULL), 
               '[]'::json
             ) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      ${whereClause}
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    return NextResponse.json({
      users: usersResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password, roles = [] } = body;

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Username, email, and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUserResult = await db.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUserResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'User with this username or email already exists' },
        { status: 409 }
      );
    }

    // Hash password using bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const userResult = await db.query(
      `INSERT INTO users (username, email, password_hash, is_active, is_superuser, created_at, updated_at)
       VALUES ($1, $2, $3, true, false, NOW(), NOW())
       RETURNING *`,
      [username, email, passwordHash]
    );

    const user = userResult.rows[0];

    // Assign roles if provided
    if (roles && Array.isArray(roles) && roles.length > 0) {
      const roleValues = roles.map((roleId: string) => 
        `('${user.id}', '${roleId}')`
      ).join(',');
      
      await db.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ${roleValues}`
      );
    }

    // Fetch created user with roles
    const createdUserResult = await db.query(`
      SELECT u.id, u.username, u.email, u.is_active, u.is_superuser, 
             u.created_at, u.updated_at, u.last_login_at,
             COALESCE(
               json_agg(
                 CASE WHEN r.id IS NOT NULL THEN 
                   jsonb_build_object('id', r.id, 'name', r.name, 'description', r.description, 'is_system_role', r.is_system_role)
                 END
               ) FILTER (WHERE r.id IS NOT NULL), 
               '[]'::json
             ) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id = $1
      GROUP BY u.id
    `, [user.id]);

    return NextResponse.json(createdUserResult.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}