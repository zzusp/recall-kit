import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { ExperienceService } from '@/lib/services/experienceService';

/**
 * GET /api/admin/experiences/generate-embeddings
 * Batch generate embeddings for all experiences that don't have embeddings yet
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get experiences without embeddings
    const { data: experiences, error } = await supabase
      .from('experience_records')
      .select('id')
      .eq('status', 'published')
      .is('embedding', null)
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    if (!experiences || experiences.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No experiences need embedding generation',
        processed: 0
      });
    }

    const experienceService = new ExperienceService();
    let successCount = 0;
    let failCount = 0;

    // Generate embeddings for each experience
    for (const exp of experiences) {
      try {
        const success = await experienceService.updateExperienceEmbedding(exp.id);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Failed to generate embedding for experience ${exp.id}:`, error);
        failCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${experiences.length} experiences`,
      processed: experiences.length,
      successCount,
      failCount
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

