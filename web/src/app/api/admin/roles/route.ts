import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/services/internal/authService';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;
    
    // Verify user and permissions - 从Authorization头或cookie中获取token
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                 request.cookies.get('session_token')?.value;
    const user = await getCurrentUser(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only superusers can view roles
    if (!user.is_superuser) {
      return NextResponse.json(
        { error: 'Only superusers can view roles' },
        { status: 403 }
      );
    }

    // Build WHERE clause for search
    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause = 'WHERE name ILIKE $1 OR description ILIKE $1';
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM roles ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get roles with permissions
    const rolesResult = await db.query(`
      SELECT r.*, 
             COALESCE(
               json_agg(
                 CASE WHEN p.id IS NOT NULL THEN 
                   jsonb_build_object('id', p.id, 'name', p.name, 'resource', p.resource, 'action', p.action, 'description', p.description)
                 END
               ) FILTER (WHERE p.id IS NOT NULL), 
               '[]'::json
             ) as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      ${whereClause}
      GROUP BY r.id
      ORDER BY r.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    return NextResponse.json({
      roles: rolesResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, permissions, permissionIds } = body;
    
    // Verify user and permissions - 从Authorization头或cookie中获取token
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ||
                 request.cookies.get('session_token')?.value;
    const user = await getCurrentUser(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only superusers can create roles
    if (!user.is_superuser) {
      return NextResponse.json(
        { error: 'Only superusers can create roles' },
        { status: 403 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: 'Role name is required' },
        { status: 400 }
      );
    }

    // Check if role already exists
    const existingRoleResult = await db.query(
      'SELECT id FROM roles WHERE name = $1',
      [name]
    );

    if (existingRoleResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'Role with this name already exists' },
        { status: 409 }
      );
    }

    // Create role
    const roleResult = await db.query(
      `INSERT INTO roles (name, description, is_system_role, created_at, updated_at)
       VALUES ($1, $2, false, NOW(), NOW())
       RETURNING *`,
      [name, description]
    );

    const role = roleResult.rows[0];

    // Assign permissions if provided - 支持两种参数名：permissions 或 permissionIds
    const permissionsToAssign = permissions || permissionIds || [];
    if (permissionsToAssign && Array.isArray(permissionsToAssign) && permissionsToAssign.length > 0) {
      const permissionValues = permissionsToAssign.map((permissionId: string) => 
        `('${role.id}', '${permissionId}')`
      ).join(',');
      
      await db.query(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ${permissionValues}`
      );
    }

    // Fetch created role with permissions
    const createdRoleResult = await db.query(`
      SELECT r.*, 
             COALESCE(
               json_agg(
                 CASE WHEN p.id IS NOT NULL THEN 
                   jsonb_build_object('id', p.id, 'name', p.name, 'resource', p.resource, 'action', p.action, 'description', p.description)
                 END
               ) FILTER (WHERE p.id IS NOT NULL), 
               '[]'::json
             ) as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      LEFT JOIN permissions p ON rp.permission_id = p.id
      WHERE r.id = $1
      GROUP BY r.id
    `, [role.id]);

    return NextResponse.json(createdRoleResult.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating role:', error);
    return NextResponse.json(
      { error: 'Failed to create role' },
      { status: 500 }
    );
  }
}
