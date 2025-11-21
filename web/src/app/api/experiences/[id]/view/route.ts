import { NextRequest } from 'next/server';
import { ExperienceService } from '@/lib/services/experienceService';
import { ApiRouteResponse } from '@/lib/utils/apiResponse';


interface Params {
  id: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    // Next.js 15 requires params to be awaited
    const { id } = await params;
    
    if (!id) {
      return ApiRouteResponse.badRequest('Experience ID is required');
    }

    const experienceService = new ExperienceService();
    const newCount = await experienceService.incrementViewCount(id);
    
    return ApiRouteResponse.success({ newCount }, 'View count incremented successfully');
  } catch (error) {
    console.error('Error incrementing view count:', error);
    return ApiRouteResponse.internalError('Failed to increment view count', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}