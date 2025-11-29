import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db/client';
import { getServerSession, hasPermission } from '@/lib/server/auth';

export const runtime = 'nodejs';

// Use Edge Runtime only in production

export async function GET(request: NextRequest) {
  try {
    // 使用 NextAuth.js 获取会话
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }

    // 检查用户是否有权限查看经验
    const currentUser = session.user as any;
    if (!currentUser.is_superuser && !hasPermission(session, 'experiences.view')) {
      return NextResponse.json(
        { error: '您没有权限查看经验' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (status !== 'all') {
      // Handle different status filters
      if (status === 'published') {
        whereClause = 'WHERE publish_status = $1 AND is_deleted = false';
        params.push('published');
        paramIndex++;
      } else if (status === 'draft') {
        whereClause = 'WHERE publish_status = $1 AND is_deleted = false';
        params.push('draft');
        paramIndex++;
      } else if (status === 'publishing') {
        whereClause = 'WHERE publish_status = $1 AND is_deleted = false';
        params.push('publishing');
        paramIndex++;
      } else if (status === 'rejected') {
        whereClause = 'WHERE publish_status = $1 AND is_deleted = false';
        params.push('rejected');
        paramIndex++;
      } else if (status === 'deleted') {
        whereClause = 'WHERE is_deleted = $1';
        params.push(true);
        paramIndex++;
      } else {
        // 对于其他未知状态，使用 publish_status 字段
        whereClause = 'WHERE publish_status = $1 AND is_deleted = false';
        params.push(status);
        paramIndex++;
      }
    } else {
      // 当 status 为 'all' 时，只显示未删除的记录
      whereClause = 'WHERE is_deleted = false';
    }

    if (search) {
      const searchCondition = ` (title ILIKE $${paramIndex} OR problem_description ILIKE $${paramIndex} OR solution ILIKE $${paramIndex})`;
      whereClause = whereClause ? whereClause + ' AND' + searchCondition : 'WHERE' + searchCondition;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM experience_records ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get experiences with keywords
    const experiencesResult = await db.query(`
      SELECT er.id, er.user_id, er.title, er.problem_description, er.root_cause, 
             er.solution, er.context, er.publish_status, er.is_deleted,
             er.query_count, er.view_count, er.has_embedding,
             er.created_at, er.updated_at, er.deleted_at,
             COALESCE(er.keywords, ARRAY[]::TEXT[]) as keywords
      FROM experience_records er
      ${whereClause}
      ORDER BY er.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    const experiences = experiencesResult.rows.map(record => ({
      ...record,
      keywords: Array.isArray(record.keywords) ? record.keywords.filter(Boolean) : []
    }));

    return NextResponse.json({
      experiences,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching admin experiences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch experiences' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 使用 NextAuth.js 获取会话
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }

    // 检查用户是否有权限创建经验
    const currentUser = session.user as any;
    if (!currentUser.is_superuser && !hasPermission(session, 'experiences.create')) {
      return NextResponse.json(
        { error: '您没有权限创建经验' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, problem_description, solution, root_cause, context, keywords, publish_status = 'published' } = body;

    if (!title || !problem_description || !solution) {
      return NextResponse.json(
        { error: 'Title, problem description, and solution are required' },
        { status: 400 }
      );
    }

    // Insert new experience with keywords
    const keywordsArray = keywords && Array.isArray(keywords) ? keywords : [];
    const result = await db.query(
      `INSERT INTO experience_records 
       (title, problem_description, solution, root_cause, context, keywords, publish_status, is_deleted, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW(), NOW())
       RETURNING id, user_id, title, problem_description, root_cause, 
                solution, context, keywords, publish_status, is_deleted,
                query_count, view_count, created_at, updated_at, deleted_at`,
      [title, problem_description, solution, root_cause, context, keywordsArray, publish_status]
    );

    const experience = result.rows[0];

    return NextResponse.json(experience, { status: 201 });
  } catch (error) {
    console.error('Error creating experience:', error);
    return NextResponse.json(
      { error: 'Failed to create experience' },
      { status: 500 }
    );
  }
}