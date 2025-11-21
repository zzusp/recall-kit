import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/services/internal/authService';

export const runtime = process.env.NODE_ENV === 'production' ? 'edge' : 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const resource = searchParams.get('resource');
    
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

    // Only superusers can view permissions
    if (!user.is_superuser) {
      return NextResponse.json(
        { error: 'Only superusers can view permissions' },
        { status: 403 }
      );
    }

    // Build WHERE clause
    let whereClause = '';
    const params: any[] = [];

    if (search) {
      whereClause += 'WHERE (name ILIKE $1 OR description ILIKE $1 OR resource ILIKE $1 OR action ILIKE $1)';
      params.push(`%${search}%`);
    }

    if (resource) {
      const operator = whereClause ? 'AND' : 'WHERE';
      whereClause += ` ${operator} resource = $${params.length + 1}`;
      params.push(resource);
    }

    // Get all permissions with roles (no pagination)
    const permissionsResult = await db.query(`
      SELECT p.*, 
             COALESCE(
               json_agg(
                 CASE WHEN r.id IS NOT NULL THEN 
                   jsonb_build_object('id', r.id, 'name', r.name, 'description', r.description, 'is_system_role', r.is_system_role)
                 END
               ) FILTER (WHERE r.id IS NOT NULL), 
               '[]'::json
             ) as roles,
             COALESCE(
               json_agg(r.id) FILTER (WHERE r.id IS NOT NULL), 
               '[]'::json
             ) as role_ids
      FROM permissions p
      LEFT JOIN role_permissions rp ON p.id = rp.permission_id
      LEFT JOIN roles r ON rp.role_id = r.id
      ${whereClause}
      GROUP BY p.id
      ORDER BY p.resource, p.action
    `, params);

    // Add roles_count to each permission
    const permissions = permissionsResult.rows.map(row => ({
      ...row,
      roles_count: Array.isArray(row.role_ids) ? row.role_ids.length : 0
    }));

    return NextResponse.json({
      permissions: permissions
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

    // Only superusers can create permissions
    if (!user.is_superuser) {
      return NextResponse.json(
        { error: 'Only superusers can create permissions' },
        { status: 403 }
      );
    }

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
             ) as roles,
             COALESCE(
               json_agg(r.id) FILTER (WHERE r.id IS NOT NULL), 
               '[]'::json
             ) as role_ids
      FROM permissions p
      LEFT JOIN role_permissions rp ON p.id = rp.permission_id
      LEFT JOIN roles r ON rp.role_id = r.id
      WHERE p.id = $1
      GROUP BY p.id
    `, [permission.id]);

    // Add roles_count to the created permission
    const createdPermission = {
      ...createdPermissionResult.rows[0],
      roles_count: Array.isArray(createdPermissionResult.rows[0]?.role_ids) ? createdPermissionResult.rows[0].role_ids.length : 0
    };

    return NextResponse.json(createdPermission, { status: 201 });
  } catch (error) {
    console.error('Error creating permission:', error);
    return NextResponse.json(
      { error: 'Failed to create permission' },
      { status: 500 }
    );
  }
}