import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db/client';
import { getServerSession, isAdminOrSuperuser } from '@/lib/server/auth';

export const runtime = 'nodejs';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 使用 NextAuth.js 获取会话
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }

    // 检查用户是否为管理员或超级用户
    if (!isAdminOrSuperuser(session)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { is_deleted, publish_status } = body;

    // Build update query based on provided fields
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (typeof is_deleted === 'boolean') {
      updateFields.push(`is_deleted = $${paramIndex}`);
      updateValues.push(is_deleted);
      paramIndex++;
      
      // Also update deleted_at timestamp
      if (is_deleted) {
        updateFields.push(`deleted_at = CURRENT_TIMESTAMP`);
      } else {
        updateFields.push(`deleted_at = NULL`);
      }
    }

    if (publish_status && ['published', 'draft'].includes(publish_status)) {
      updateFields.push(`publish_status = $${paramIndex}`);
      updateValues.push(publish_status);
      paramIndex++;
      
      // Also update legacy status field for backward compatibility
      // Remove status field update - no longer needed
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Add updated_at timestamp
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add experience ID to values
    updateValues.push(id);

    const result = await db.query(
      `UPDATE experience_records 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, user_id, title, problem_description, root_cause, 
                solution, context, publish_status, is_deleted, query_count, view_count, 
                created_at, updated_at, deleted_at`,
      updateValues
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Experience not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating experience:', error);
    return NextResponse.json(
      { error: 'Failed to update experience' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 使用 NextAuth.js 获取会话
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }

    // 检查用户是否为管理员或超级用户
    if (!isAdminOrSuperuser(session)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Soft delete by setting is_deleted to true and updating deleted_at
    const result = await db.query(
      `UPDATE experience_records 
       SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Experience not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting experience:', error);
    return NextResponse.json(
      { error: 'Failed to delete experience' },
      { status: 500 }
    );
  }
}