import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/server/auth';
import { ApiRouteResponse, ErrorResponses } from '@/lib/utils/apiResponse';
import { db } from '@/lib/server/db/client';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 使用 NextAuth.js 获取会话
    const session = await getServerSession();
    if (!session) {
      return ApiRouteResponse.unauthorized('未授权访问');
    }
    const currentUser = session.user as any;

    // 查询经验记录
    const query = `
      SELECT 
        er.id, er.user_id, er.title, er.problem_description, er.root_cause, 
        er.solution, er.context, er.publish_status, er.is_deleted,
        er.query_count, er.view_count, 
        er.created_at, er.updated_at, er.deleted_at,
        COALESCE(er.keywords, ARRAY[]::TEXT[]) as keywords
      FROM experience_records er
      WHERE er.id = $1 AND er.user_id = $2
    `;

    const result = await db.query(query, [id, currentUser.id]);

    if (result.rows.length === 0) {
      return ApiRouteResponse.notFound('经验不存在');
    }

    const experience = {
      ...result.rows[0],
      keywords: Array.isArray(result.rows[0].keywords) 
        ? result.rows[0].keywords.filter(Boolean) 
        : []
    };

    return ApiRouteResponse.success(experience);

  } catch (error) {
    console.error('Error fetching experience:', error);
    return ApiRouteResponse.internalError('获取经验详情失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, problem_description, root_cause, solution, context, keywords } = body;

    // 验证必填字段
    if (!title || !problem_description || !solution) {
      return ApiRouteResponse.badRequest('标题、问题描述和解决方案为必填项');
    }

    // 使用 NextAuth.js 获取会话
    const session = await getServerSession();
    if (!session) {
      return ApiRouteResponse.unauthorized('未授权访问');
    }
    const currentUser = session.user as any;

    // 检查经验是否存在且属于当前用户
    const checkQuery = `
      SELECT id, publish_status, is_deleted
      FROM experience_records 
      WHERE id = $1 AND user_id = $2
    `;
    
    const checkResult = await db.query(checkQuery, [id, currentUser.id]);
    
    if (checkResult.rows.length === 0) {
      return ApiRouteResponse.notFound('经验不存在');
    }

    const existingExperience = checkResult.rows[0];

    // 更新经验记录，关键字直接更新到 keywords 字段
    const keywordsArray = keywords && Array.isArray(keywords) ? keywords : [];
    const updateQuery = `
      UPDATE experience_records 
      SET title = $1, problem_description = $2, root_cause = $3, 
          solution = $4, context = $5, keywords = $6, updated_at = NOW()
      WHERE id = $7 AND user_id = $8
      RETURNING id, user_id, title, problem_description, root_cause, 
                solution, context, keywords, publish_status, is_deleted, query_count, view_count, 
                created_at, updated_at, deleted_at
    `;

    const updateResult = await db.query(updateQuery, [
      title, problem_description, root_cause, solution, context, keywordsArray, id, currentUser.id
    ]);

    const experience = updateResult.rows[0];

    return ApiRouteResponse.success(experience, '经验更新成功');

  } catch (error) {
    console.error('Error updating experience:', error);
    return ApiRouteResponse.internalError('更新经验失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body; // 'publish' | 'unpublish' | 'delete' | 'restore'

    if (!action || !['publish', 'unpublish', 'delete', 'restore'].includes(action)) {
      return ApiRouteResponse.badRequest('无效的操作类型');
    }

    // 使用 NextAuth.js 获取会话
    const session = await getServerSession();
    if (!session) {
      return ApiRouteResponse.unauthorized('未授权访问');
    }
    const currentUser = session.user as any;

    // 检查经验是否存在且属于当前用户
    const checkQuery = `
      SELECT id, publish_status, is_deleted
      FROM experience_records 
      WHERE id = $1 AND user_id = $2
    `;
    
    const checkResult = await db.query(checkQuery, [id, currentUser.id]);
    
    if (checkResult.rows.length === 0) {
      return ApiRouteResponse.notFound('经验不存在');
    }

    const existingExperience = checkResult.rows[0];

    let updateQuery = '';
    let updateParams: any[] = [];
    let successMessage = '';

    switch (action) {
      case 'publish':
        if (existingExperience.publish_status === 'published') {
          return ApiRouteResponse.badRequest('经验已经是发布状态');
        }
        
        // 直接发布
        updateQuery = `
          UPDATE experience_records 
          SET 
            publish_status = 'published',
            updated_at = NOW()
          WHERE id = $1 AND user_id = $2
          RETURNING id, publish_status, is_deleted
        `;
        updateParams = [id, currentUser.id];
        successMessage = '经验发布成功';
        break;

      case 'unpublish':
        if (existingExperience.publish_status === 'draft') {
          return ApiRouteResponse.badRequest('经验已经是草稿状态');
        }
        updateQuery = `
          UPDATE experience_records 
          SET publish_status = 'draft', updated_at = NOW()
          WHERE id = $1 AND user_id = $2
          RETURNING id, publish_status, is_deleted
        `;
        updateParams = [id, currentUser.id];
        successMessage = '经验已取消发布';
        break;

      case 'delete':
        if (existingExperience.is_deleted) {
          return ApiRouteResponse.badRequest('经验已删除');
        }
        if (existingExperience.publish_status === 'published') {
          return ApiRouteResponse.badRequest('已发布的经验需要先取消发布才能删除');
        }
        updateQuery = `
          UPDATE experience_records 
          SET is_deleted = true, deleted_at = NOW(), updated_at = NOW()
          WHERE id = $1 AND user_id = $2
          RETURNING id, publish_status, is_deleted
        `;
        updateParams = [id, currentUser.id];
        successMessage = '经验删除成功';
        break;

      case 'restore':
        if (!existingExperience.is_deleted) {
          return ApiRouteResponse.badRequest('经验未被删除，无需恢复');
        }
        updateQuery = `
          UPDATE experience_records 
          SET is_deleted = false, deleted_at = NULL, updated_at = NOW()
          WHERE id = $1 AND user_id = $2
          RETURNING id, publish_status, is_deleted, deleted_at
        `;
        updateParams = [id, currentUser.id];
        successMessage = '经验恢复成功';
        break;
    }

    const updateResult = await db.query(updateQuery, updateParams);

    return ApiRouteResponse.success(updateResult.rows[0], successMessage);

  } catch (error) {
    console.error('Error updating experience status:', error);
    return ApiRouteResponse.internalError('更新经验状态失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 注意：实际删除使用 PATCH 方法，这个方法保留用于完全删除（如果需要的话）
  return ApiRouteResponse.badRequest('请使用 PATCH 方法来删除经验');
}