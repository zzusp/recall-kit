import { NextRequest, NextResponse } from 'next/server';
import { ExperienceService } from '@/lib/server/services/experience';
import { EmbeddingService } from '@/lib/server/services/embedding';
import { getServerSession } from '@/lib/server/auth';
import { ApiRouteResponse, ApiRouteError } from '@/lib/utils/apiResponse';

export const runtime = 'nodejs';

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
      return ApiRouteError.badRequest('Experience ID is required');
    }

    // 使用 NextAuth.js 验证会话
    const session = await getServerSession();
    if (!session || !session.user) {
      return ApiRouteError.unauthorized('请先登录后进行此操作');
    }

    const experienceService = new ExperienceService();
    const embeddingService = new EmbeddingService();
    
    // 获取经验记录（带权限检查）
    const experience = await experienceService.getExperienceById(id, session.user.id);
    if (!experience) {
      return ApiRouteError.notFound('Experience not found');
    }
    
    // 检查权限：只有经验作者或管理员才能生成embedding
    const currentUser = session.user as any;
    const isAdmin = currentUser.is_superuser || currentUser.roles?.some((role: any) => role.name === 'admin');
    
    if (experience.user_id !== currentUser.id && !isAdmin) {
      return ApiRouteError.forbidden('无权为此经验生成embedding');
    }
    
    // 为经验生成embedding
    const embedding = await embeddingService.generateExperienceEmbedding(experience);
    
    // 这里可以进一步保存embedding到数据库
    // 暂时返回成功响应
    
    return ApiRouteResponse.success({
      experienceId: id,
      embeddingGenerated: true,
      embeddingDimensions: embedding.length
    }, 'Embedding generated successfully');
    
  } catch (error) {
    console.error('Error generating embedding:', error);
    return ApiRouteError.internal('Failed to generate embedding', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}
