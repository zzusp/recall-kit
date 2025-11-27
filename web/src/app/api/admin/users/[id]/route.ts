import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db/client';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Using subquery to avoid complex GROUP BY
    const result = await db.query(`
      SELECT u.id, u.username, u.email, u.is_active, u.is_superuser, 
             u.created_at, u.updated_at, u.last_login_at,
             (
               SELECT COALESCE(
                 json_agg(
                   jsonb_build_object('id', r.id, 'name', r.name, 'description', r.description, 'is_system_role', r.is_system_role)
                 ),
                 '[]'::json
               )
               FROM user_roles ur
               JOIN roles r ON ur.role_id = r.id
               WHERE ur.user_id = u.id
             ) as roles
      FROM users u
      WHERE u.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { username, email, is_active, is_superuser, roleIds, roles } = body;

    // Check if user exists
    const existingUserResult = await db.query(
      'SELECT id FROM users WHERE id = $1',
      [id]
    );

    if (existingUserResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check for duplicate username or email (excluding current user)
    if (username || email) {
      const duplicateUserResult = await db.query(
        'SELECT id FROM users WHERE (username = $1 OR email = $2) AND id != $3',
        [username, email, id]
      );

      if (duplicateUserResult.rows.length > 0) {
        return NextResponse.json(
          { error: 'Username or email already exists' },
          { status: 409 }
        );
      }
    }

    // Update user
    const userResult = await db.query(
      `UPDATE users 
       SET username = COALESCE($1, username),
           email = COALESCE($2, email),
           is_active = COALESCE($3, is_active),
           is_superuser = COALESCE($4, is_superuser),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [username, email, is_active, is_superuser, id]
    );

    const user = userResult.rows[0];

    // Update roles if provided (support both roleIds and roles for compatibility)
    const roleIdsToUse = roleIds || roles;
    if (roleIdsToUse && Array.isArray(roleIdsToUse)) {
      // Delete existing roles
      await db.query(
        'DELETE FROM user_roles WHERE user_id = $1',
        [id]
      );

        // Insert new roles
      if (roleIdsToUse.length > 0) {
        const roleValues = roleIdsToUse.map((roleId: string) => 
          `('${id}', '${roleId}')`
        ).join(',');
        
        await db.query(
          `INSERT INTO user_roles (user_id, role_id) VALUES ${roleValues}`
        );
      }
    }

    // Fetch updated user with roles - using subquery to avoid complex GROUP BY
    const updatedUserResult = await db.query(`
      SELECT u.id, u.username, u.email, u.is_active, u.is_superuser, 
             u.created_at, u.updated_at, u.last_login_at,
             (
               SELECT COALESCE(
                 json_agg(
                   jsonb_build_object('id', r.id, 'name', r.name, 'description', r.description, 'is_system_role', r.is_system_role)
                 ),
                 '[]'::json
               )
               FROM user_roles ur
               JOIN roles r ON ur.role_id = r.id
               WHERE ur.user_id = u.id
             ) as roles
      FROM users u
      WHERE u.id = $1
    `, [id]);

    return NextResponse.json(updatedUserResult.rows[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check if user exists
    const existingUserResult = await db.query(
      'SELECT id FROM users WHERE id = $1',
      [id]
    );

    if (existingUserResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Delete user (cascade will handle user_roles)
    const result = await db.query(
      'DELETE FROM users WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}