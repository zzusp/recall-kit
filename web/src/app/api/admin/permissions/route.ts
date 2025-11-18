import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const resource = searchParams.get('resource');
    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += 'WHERE (name ILIKE $1 OR description ILIKE $1 OR resource ILIKE $1 OR action ILIKE $1)';
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (resource) {
      const operator = whereClause ? 'AND' : 'WHERE';
      whereClause += ` ${operator} resource = $${paramIndex}`;
      params.push(resource);
      paramIndex++;
    }

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM permissions ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get permissions with roles
    const permissionsResult = await db.query(`
      SELECT p.*, 
             COALESCE(
               json_agg(
                 CASE WHEN r.id IS NOT NULL THEN 
                   jsonb_build_object('id', r.id, 'name', r.name, 'description', r.description, 'is_system_role', r.is_system_role)
                 END
               ) FILTER (WHERE r.id IS NOT NULL), 
               '[]'::json
             ) as roles
      FROM permissions p
      LEFT JOIN role_permissions rp ON p.id = rp.permission_id
      LEFT JOIN roles r ON rp.role_id = r.id
      ${whereClause}
      GROUP BY p.id
      ORDER BY p.resource, p.action
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    return NextResponse.json({
      permissions: permissionsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, resource, action, description } = body;

    if (!name || !resource || !action) {
      return NextResponse.json(
        { error: 'Name, resource, and action are required' },
        { status: 400 }
      );
    }

    // Check if permission already exists
    const existingPermissionResult = await db.query(
      'SELECT id FROM permissions WHERE name = $1 OR (resource = $2 AND action = $3)',
      [name, resource, action]
    );

    if (existingPermissionResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'Permission with this name or resource+action combination already exists' },
        { status: 409 }
      );
    }

    // Create permission
    const permissionResult = await db.query(
      `INSERT INTO permissions (name, resource, action, description, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [name, resource, action, description]
    );

    const permission = permissionResult.rows[0];

    // Fetch created permission with roles
    const createdPermissionResult = await db.query(`
      SELECT p.*, 
             COALESCE(
               json_agg(
                 CASE WHEN r.id IS NOT NULL THEN 
                   jsonb_build_object('id', r.id, 'name', r.name, 'description', r.description, 'is_system_role', r.is_system_role)
                 END
               ) FILTER (WHERE r.id IS NOT NULL), 
               '[]'::json
             ) as roles
      FROM permissions p
      LEFT JOIN role_permissions rp ON p.id = rp.permission_id
      LEFT JOIN roles r ON rp.role_id = r.id
      WHERE p.id = $1
      GROUP BY p.id
    `, [permission.id]);

    return NextResponse.json(createdPermissionResult.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating permission:', error);
    return NextResponse.json(
      { error: 'Failed to create permission' },
      { status: 500 }
    );
  }
}