import { NextRequest, NextResponse } from 'next/server';
import { ExperienceService } from '@/lib/services/experienceService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const q = searchParams.get('q') || '';
    const keywords = searchParams.get('keywords')?.split(',') || [];
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const sort = searchParams.get('sort') as 'relevance' | 'query_count' | 'created_at' || 'relevance';

    const experienceService = new ExperienceService();
    const result = await experienceService.queryExperiences({
      q,
      keywords,
      limit,
      offset,
      sort
    });

    return NextResponse.json({
      success: true,
      data: {
        experiences: result.experiences,
        pagination: {
          total: result.totalCount,
          limit,
          offset,
          hasMore: result.hasMore
        }
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';