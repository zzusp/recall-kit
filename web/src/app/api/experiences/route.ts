import { NextRequest } from 'next/server';
import { ExperienceService } from '@/lib/server/services/experience';
import { ApiRouteResponse, ApiRouteError } from '@/lib/utils/apiResponse';
import { db } from '@/lib/server/db/client';
import { getServerSession } from '@/lib/server/auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') as 'all' | 'published' | 'draft' || 'all';
    const myOwn = searchParams.get('myOwn') === 'true';
    const offset = (page - 1) * limit;

    // 构建查询条件
    let whereClause = 'WHERE is_deleted = false';
    const queryParams: any[] = [];
    let paramIndex = 1;

    // 必须登录才能访问经验列表
    if (!session || !session.user) {
      return ApiRouteError.unauthorized('请先登录后查看经验列表');
    }
    
    const currentUser = session.user as any;
    
    // 如果查看自己的经验
    if (myOwn) {
      whereClause += ` AND user_id = $${paramIndex}`;
      queryParams.push(currentUser.id);
      paramIndex++;
    } else {
      // 已登录用户可以查看所有已发布的经验 + 自己的所有经验（包括草稿）
      whereClause += ` AND (publish_status = 'published' OR user_id = $${paramIndex})`;
      queryParams.push(currentUser.id);
      paramIndex++;
    }
    
    // 如果指定了状态过滤
    if (status !== 'all') {
      whereClause += ` AND publish_status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    // 搜索条件（对已登录或未登录都适用）
    if (search) {
      whereClause += ` AND (title ILIKE $${paramIndex} OR problem_description ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // 查询经验记录
    const query = `
      SELECT 
        id, title, problem_description, root_cause, solution, context,
        publish_status, is_deleted, query_count, view_count,
        has_embedding, created_at, updated_at, deleted_at,
        user_id,
        COALESCE(keywords, ARRAY[]::TEXT[]) as keywords
      FROM experience_records
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const result = await db.query(query, queryParams);

    // 获取总数
    let countQuery = `
      SELECT COUNT(*) as total
      FROM experience_records
      ${whereClause}
    `;
    
    const countParams = queryParams.slice(0, -2); // 移除 limit 和 offset
    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    // 为每个经验记录获取作者信息
    const experiences = await Promise.all(
      result.rows.map(async (record) => {
        const userResult = await db.query(
          'SELECT username FROM users WHERE id = $1',
          [record.user_id]
        );

        return {
          ...record,
          author: userResult.rows[0]?.username || 'Unknown',
          // 敏感信息只给作者本人查看
          ...(session && session.user && record.user_id === (session.user as any).id ? {} : {
            problem_description: record.problem_description?.substring(0, 100) + (record.problem_description?.length > 100 ? '...' : ''),
            root_cause: record.root_cause?.substring(0, 100) + (record.root_cause?.length > 100 ? '...' : ''),
            solution: record.solution?.substring(0, 100) + (record.solution?.length > 100 ? '...' : ''),
            context: record.context?.substring(0, 100) + (record.context?.length > 100 ? '...' : '')
          }),
          keywords: Array.isArray(record.keywords) ? record.keywords.filter(Boolean) : []
        };
      })
    );

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
    console.error('Error fetching experiences:', error);
    return ApiRouteError.internal('获取经验列表失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return ApiRouteError.unauthorized('未授权访问');
    }

    const body = await request.json();
    const { title, problem_description, root_cause, solution, context, keywords, publish_status } = body;

    // 验证必填字段
    if (!title || !problem_description || !solution) {
      return ApiRouteError.badRequest('标题、问题描述和解决方案为必填项');
    }

    const currentUser = session.user as any;
    const keywordsArray = keywords && Array.isArray(keywords) ? keywords : [];

    // 插入新的经验记录
    const insertQuery = `
      INSERT INTO experience_records 
      (user_id, title, problem_description, root_cause, solution, context, keywords,
       publish_status, is_deleted, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, NOW(), NOW())
      RETURNING id, user_id, title, problem_description, root_cause, 
                solution, context, keywords, publish_status, is_deleted, query_count, view_count, 
                created_at, updated_at, deleted_at
    `;

    const result = await db.query(insertQuery, [
      currentUser.id, title, problem_description, root_cause, 
      solution, context, keywordsArray, publish_status || 'draft'
    ]);

    const experience = result.rows[0];

    return ApiRouteResponse.created(experience, '经验创建成功');

  } catch (error) {
    console.error('Error creating experience:', error);
    return ApiRouteError.internal('创建经验失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}
