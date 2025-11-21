import { NextRequest, NextResponse } from 'next/server';
import { ExperienceService } from '@/lib/services/experienceService';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Experience ID is required' },
        { status: 400 }
      );
    }

    console.log('[API] Generating embedding for experience:', id);

    const experienceService = new ExperienceService();
    const success = await experienceService.updateExperienceEmbedding(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to generate embedding' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error generating embedding:', error);
    
    // Return more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Failed to generate embedding',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
