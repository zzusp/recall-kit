import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser, hasRole } from '@/lib/services/authService';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params as required by Next.js
    const { id } = await params;
    
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
    const { reviewStatus, reviewNote } = body;

    if (!['approved', 'rejected'].includes(reviewStatus)) {
      return NextResponse.json(
        { error: 'Invalid review status. Must be "approved" or "rejected"' },
        { status: 400 }
      );
    }

    // Start transaction using db.query directly
    try {
      await db.query('BEGIN');

      // Update experience review status
      const updateResult = await db.query(`
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
        WHERE id = $4 AND review_status = 'pending'
        RETURNING id, title, review_status, reviewed_at, reviewed_by
      `, [reviewStatus, user.id, reviewNote || null, id]);

      if (updateResult.rows.length === 0) {
        await db.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Experience not found or already reviewed' },
          { status: 404 }
        );
      }

      // Log admin action
      await db.query(`
        INSERT INTO admin_actions (admin_id, action_type, target_type, target_id, action_details)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        user.id,
        `review_${reviewStatus}`,
        'experience',
        id,
        {
          review_status: reviewStatus,
          review_note: reviewNote,
          experience_title: updateResult.rows[0].title
        }
      ]);

      await db.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: `Experience ${reviewStatus} successfully`,
        experience: updateResult.rows[0]
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error reviewing experience:', error);
    return NextResponse.json(
      { error: 'Failed to review experience' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params as required by Next.js
    const { id } = await params;
    
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

    // Get experience with full details
    const experienceResult = await db.query(`
      SELECT 
        er.id, er.user_id, er.title, er.problem_description, er.root_cause, 
        er.solution, er.context, er.publish_status, er.is_deleted,
        er.review_status, er.reviewed_by, er.reviewed_at, er.review_note,
        er.query_count, er.view_count, er.relevance_score, er.has_embedding,
        er.created_at, er.updated_at, er.deleted_at,
        reviewer.username as reviewer_username,
        submitter.username as submitter_username,
        COALESCE(
          json_agg(
            CASE WHEN ek.keyword IS NOT NULL THEN ek.keyword END
          ) FILTER (WHERE ek.keyword IS NOT NULL), 
          '[]'::json
        ) as keywords
      FROM experience_records er
      LEFT JOIN users reviewer ON er.reviewed_by = reviewer.id
      LEFT JOIN users submitter ON er.user_id = submitter.id
      LEFT JOIN experience_keywords ek ON er.id = ek.experience_id
      WHERE er.id = $1
      GROUP BY er.id, reviewer.username, submitter.username
    `, [id]);

    if (experienceResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Experience not found' },
        { status: 404 }
      );
    }

    const experience = {
      ...experienceResult.rows[0],
      keywords: Array.isArray(experienceResult.rows[0].keywords) 
        ? experienceResult.rows[0].keywords.filter(Boolean) 
        : []
    };

    return NextResponse.json({
      success: true,
      experience
    });
  } catch (error) {
    console.error('Error fetching experience for review:', error);
    return NextResponse.json(
      { error: 'Failed to fetch experience' },
      { status: 500 }
    );
  }
}