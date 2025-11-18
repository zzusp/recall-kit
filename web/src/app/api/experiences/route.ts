import { NextRequest, NextResponse } from 'next/server';
import { ExperienceService } from '@/lib/services/experienceService';
import { db } from '@/lib/db/client';

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

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in experiences API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch experiences' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // TODO: Add proper validation
    const { title, problem_description, solution, root_cause, context, keywords } = body;

    // Insert new experience
    const result = await db.query(
      `INSERT INTO experience_records 
       (title, problem_description, solution, root_cause, context, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'published', NOW(), NOW())
       RETURNING *`,
      [title, problem_description, solution, root_cause, context]
    );

    const experience = result.rows[0];

    // Insert keywords if provided
    if (keywords && Array.isArray(keywords) && keywords.length > 0) {
      const keywordValues = keywords.map((keyword: string) => 
        `('${experience.id}', '${keyword}')`
      ).join(', ');
      
      await db.query(
        `INSERT INTO experience_keywords (experience_id, keyword) VALUES ${keywordValues}`
      );
    }

    return NextResponse.json(experience);
  } catch (error) {
    console.error('Error creating experience:', error);
    return NextResponse.json(
      { error: 'Failed to create experience' },
      { status: 500 }
    );
  }
}