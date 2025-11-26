import { NextRequest } from 'next/server';
import { ExperienceService } from '@/lib/server/services/experience';
import { ApiRouteResponse, ErrorResponses } from '@/lib/utils/apiResponse';
import { db } from '@/lib/server/db/client';
import { getCurrentUser } from '@/lib/server/services/auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const q = searchParams.get('q') || undefined;
    const keywords = searchParams.get('keywords')?.split(',').filter(Boolean) || [];
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sort = (searchParams.get('sort') as 'relevance' | 'query_count' | 'created_at') || 'relevance';
    const useVectorSearch = searchParams.get('useVectorSearch') !== 'false';

    const experienceService = new ExperienceService();
    const result = await experienceService.queryExperiences({
      q,
      keywords,
      limit,
      offset,
      sort,
      useVectorSearch
    });

    // 使用统一响应格式
    return ApiRouteResponse.success(result);
  } catch (error) {
    console.error('Error in experiences API:', error);
    return ApiRouteResponse.internalError('Failed to fetch experiences', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get session token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiRouteResponse.unauthorized('Authorization token required');
    }

    const token = authHeader.substring(7);
    
    // Verify user
    const user = await getCurrentUser(token);
    if (!user) {
      return ApiRouteResponse.unauthorized('Invalid or expired token');
    }

    const body = await request.json();
    
    // TODO: Add proper validation
    const { title, problem_description, solution, root_cause, context, keywords } = body;

    // 验证必填字段
    if (!title || !problem_description || !solution) {
      return ApiRouteResponse.badRequest('Title, problem description, and solution are required');
    }
    
    // Extract review status from body or default to 'pending'
    const { review_status } = body;
    const finalReviewStatus = review_status || 'pending';
    
    // Insert new experience with draft publish status
    const result = await db.query(
      `INSERT INTO experience_records 
       (user_id, title, problem_description, solution, root_cause, context, publish_status, is_deleted, review_status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft', false, $7, NOW(), NOW())
       RETURNING id, user_id, title, problem_description, root_cause, 
                solution, context, publish_status, is_deleted, review_status,
                query_count, view_count, relevance_score, created_at, updated_at, deleted_at`,
      [
        user.id,
        title,
        problem_description,
        solution,
        root_cause,
        context,
        finalReviewStatus
      ]
    );

    const experience = result.rows[0];

    // Insert keywords if provided
    if (keywords && Array.isArray(keywords) && keywords.length > 0) {
      const keywordValues = keywords.map((keyword: string) => 
        `('${experience.id}', '${keyword.replace(/'/g, "''")}')`  // Escape single quotes
      ).join(', ');
      
      await db.query(
        `INSERT INTO experience_keywords (experience_id, keyword) VALUES ${keywordValues}`
      );
    }

    return ApiRouteResponse.success(experience, 'Experience created successfully', 201);
  } catch (error) {
    console.error('Error creating experience:', error);
    return ApiRouteResponse.internalError('Failed to create experience', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}