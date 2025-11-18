import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { ExperienceService } from '@/lib/services/experienceService';
import { getCurrentUser, hasRole } from '@/lib/services/newAuthService';

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

    if (!hasRole(user, 'admin')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { limit = 50 } = await request.json();

    // Get experiences without embeddings
    const result = await db.query(
      'SELECT id FROM experience_records WHERE status = $1 AND (has_embedding = false OR has_embedding IS NULL) ORDER BY created_at DESC LIMIT $2',
      ['published', limit]
    );

    const experiences = result.rows;

    if (experiences.length === 0) {
      return NextResponse.json({ 
        message: 'No experiences need embeddings',
        processed: 0,
        successful: 0,
        failed: 0
      });
    }

    const experienceService = new ExperienceService();
    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const experience of experiences) {
      results.processed++;
      try {
        const success = await experienceService.updateExperienceEmbedding(experience.id);
        if (success) {
          results.successful++;
        } else {
          results.failed++;
          results.errors.push(`Failed to generate embedding for experience ${experience.id}`);
        }
      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Error for experience ${experience.id}: ${errorMessage}`);
        console.error(`Failed to generate embedding for experience ${experience.id}:`, error);
      }
    }

    return NextResponse.json({
      message: `Processed ${results.processed} experiences. ${results.successful} successful, ${results.failed} failed.`,
      ...results
    });
  } catch (error) {
    console.error('Error generating embeddings:', error);
    return NextResponse.json(
      { error: 'Failed to generate embeddings' },
      { status: 500 }
    );
  }
}