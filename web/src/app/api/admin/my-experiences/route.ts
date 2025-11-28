import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/server/auth';
import { ApiRouteResponse, ErrorResponses } from '@/lib/utils/apiResponse';
import { db } from '@/lib/server/db/client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    // 使用 NextAuth.js 获取会话
    const session = await getServerSession();
    if (!session) {
      return ApiRouteResponse.unauthorized('未授权访问');
    }
    const currentUser = session.user as any;

    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') as 'all' | 'published' | 'draft' | 'deleted' || 'all';
    const offset = (page - 1) * limit;

    // 构建查询条件
    let whereClause = 'WHERE er.user_id = $1';
    const params: any[] = [currentUser.id];
    let paramIndex = 2;

    // 根据状态过滤
    switch (status) {
      case 'published':
        whereClause += ' AND er.publish_status = $2 AND er.is_deleted = false';
        params.push('published');
        paramIndex = 3;
        break;
      case 'draft':
        whereClause += ' AND er.publish_status = $2 AND er.is_deleted = false';
        params.push('draft');
        paramIndex = 3;
        break;
      case 'deleted':
        whereClause += ' AND er.is_deleted = true';
        break;
      default: // all
        whereClause += ' AND er.is_deleted = false';
        break;
    }

    // 查询经验记录
    const query = `
      SELECT 
        er.id, er.title, er.problem_description, er.root_cause, 
        er.solution, er.context, er.publish_status, er.is_deleted,
        er.query_count, er.view_count, 
        er.has_embedding, er.created_at, er.updated_at, er.deleted_at,
        COALESCE(er.keywords, ARRAY[]::TEXT[]) as keywords
      FROM experience_records er
      ${whereClause}
      ORDER BY er.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);
    const result = await db.query(query, params);

    // 获取总数
    let countQuery = `
      SELECT COUNT(DISTINCT er.id) as total
      FROM experience_records er
      ${whereClause}
    `;
    
    const countParams = status === 'all' || status === 'deleted' 
      ? [currentUser.id] 
      : [currentUser.id, status === 'published' ? 'published' : 'draft'];

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    // 转换数据格式
    const experiences = result.rows.map(record => ({
      ...record,
      keywords: Array.isArray(record.keywords) ? record.keywords.filter(Boolean) : []
    }));

    return ApiRouteResponse.success({
      experiences,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: (page * limit) < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching my experiences:', error);
    return ApiRouteResponse.internalError('获取个人经验失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}

export async function POST(request: NextRequest) {
  try {
    // 使用 NextAuth.js 获取会话
    const session = await getServerSession();
    if (!session) {
      return ApiRouteResponse.unauthorized('未授权访问');
    }
    const currentUser = session.user as any;

    const body = await request.json();
    const { title, problem_description, root_cause, solution, context, keywords } = body;

    // 验证必填字段
    if (!title || !problem_description || !solution) {
      return ApiRouteResponse.badRequest('标题、问题描述和解决方案为必填项');
    }

    // 插入新的经验记录，关键字直接存储在 keywords 字段中
    const keywordsArray = keywords && Array.isArray(keywords) ? keywords : [];
    const insertQuery = `
      INSERT INTO experience_records 
      (user_id, title, problem_description, root_cause, solution, context, keywords,
       publish_status, is_deleted, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', false, NOW(), NOW())
      RETURNING id, user_id, title, problem_description, root_cause, 
                solution, context, keywords, publish_status, is_deleted, query_count, view_count, 
                created_at, updated_at, deleted_at
    `;

    const result = await db.query(insertQuery, [
      currentUser.id, title, problem_description, root_cause, solution, context, keywordsArray
    ]);

    const experience = result.rows[0];

    return ApiRouteResponse.success(experience, '经验创建成功', 201);

  } catch (error) {
    console.error('Error creating experience:', error);
    return ApiRouteResponse.internalError('创建经验失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}