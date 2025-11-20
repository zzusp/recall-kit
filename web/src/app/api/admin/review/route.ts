import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser, hasRole } from '@/lib/services/internal/authService';

export async function GET(request: NextRequest) {
  try {
    // Get session token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Verify user and admin role
    const user = await getCurrentUser(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Check if user has review permissions
    if (!hasRole(user, 'admin') && !hasRole(user, 'editor') && !user.is_superuser) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const reviewStatus = searchParams.get('review_status') || 'pending';
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereClause = 'WHERE er.review_status = $1';
    const params: any[] = [reviewStatus];
    let paramIndex = 2;

    if (search) {
      const searchCondition = ` AND (er.title ILIKE $${paramIndex} OR er.problem_description ILIKE $${paramIndex} OR er.solution ILIKE $${paramIndex})`;
      whereClause += searchCondition;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM experience_records er ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get experiences with keywords and reviewer info
    const experiencesResult = await db.query(`
      SELECT 
        er.id, er.user_id, er.title, er.problem_description, er.root_cause, 
        er.solution, er.context, er.publish_status, er.is_deleted,
        er.review_status, er.reviewed_by, er.reviewed_at, er.review_note,
        er.query_count, er.view_count, er.relevance_score, er.has_embedding,
        er.created_at, er.updated_at, er.deleted_at,
        reviewer.username as reviewer_username,
        COALESCE(
          json_agg(
            CASE WHEN ek.keyword IS NOT NULL THEN ek.keyword END
          ) FILTER (WHERE ek.keyword IS NOT NULL), 
          '[]'::json
        ) as keywords
      FROM experience_records er
      LEFT JOIN users reviewer ON er.reviewed_by = reviewer.id
      LEFT JOIN experience_keywords ek ON er.id = ek.experience_id
      ${whereClause}
      GROUP BY er.id, reviewer.username
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
    console.error('Error fetching review queue:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review queue' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get session token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Verify user and admin role
    const user = await getCurrentUser(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Check if user has review permissions
    if (!hasRole(user, 'admin') && !hasRole(user, 'editor') && !user.is_superuser) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { experienceIds, reviewStatus, reviewNote } = body;

    if (!experienceIds || !Array.isArray(experienceIds) || experienceIds.length === 0) {
      return NextResponse.json(
        { error: 'Experience IDs are required' },
        { status: 400 }
      );
    }

    if (!['approved', 'rejected'].includes(reviewStatus)) {
      return NextResponse.json(
        { error: 'Invalid review status' },
        { status: 400 }
      );
    }

    // Start transaction
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      // Update experiences
      const updateResult = await client.query(`
        UPDATE experience_records 
        SET 
          review_status = $1,
          reviewed_by = $2,
          reviewed_at = NOW(),
          review_note = $3,
          publish_status = CASE 
            WHEN $1 = 'approved' THEN 'published'
            WHEN $1 = 'rejected' THEN 'rejected'
            ELSE publish_status
          END,
          updated_at = NOW()
        WHERE id = ANY($4)
        RETURNING id, title, review_status
      `, [reviewStatus, user.id, reviewNote || null, experienceIds]);

      // Log admin action
      await client.query(`
        INSERT INTO admin_actions (admin_id, action_type, target_type, target_ids, action_details)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        user.id,
        `batch_${reviewStatus}`,
        'experience',
        experienceIds,
        {
          review_status: reviewStatus,
          review_note: reviewNote,
          count: experienceIds.length
        }
      ]);

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: `Successfully ${reviewStatus} ${experienceIds.length} experiences`,
        updated_experiences: updateResult.rows
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in batch review:', error);
    return NextResponse.json(
      { error: 'Failed to process batch review' },
      { status: 500 }
    );
  }
}