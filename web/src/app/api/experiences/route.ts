import { NextRequest, NextResponse } from 'next/server';
import { ExperienceService } from '@/lib/services/experienceService';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const q = searchParams.get('q') || '';
    const keywords = searchParams.get('keywords')?.split(',') || [];
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const sort = searchParams.get('sort') as 'relevance' | 'query_count' | 'created_at' || 'relevance';

    // Create a Supabase client for server-side operations
    // Try to use admin client for better access to settings, fallback to server client
    let supabaseClient;
    try {
      supabaseClient = createAdminClient();
    } catch {
      // If admin client is not available, use server client
      supabaseClient = await createClient();
    }

    const experienceService = new ExperienceService(supabaseClient);
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

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;