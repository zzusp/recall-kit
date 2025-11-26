import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/server/services/auth';
import { ApiRouteResponse } from '@/lib/utils/apiResponse';
import { db } from '@/lib/server/db/client';
import { EmbeddingService } from '@/lib/server/services/embedding';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: experienceId } = await params;

    // 获取当前用户信息
    const sessionToken = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!sessionToken) {
      return ApiRouteResponse.unauthorized('未授权访问');
    }

    const currentUser = await getCurrentUser(sessionToken);
    if (!currentUser) {
      return ApiRouteResponse.unauthorized('用户未登录');
    }

    // 检查经验记录是否存在且属于当前用户
    const experienceQuery = `
      SELECT id, title, problem_description, root_cause, solution, context, has_embedding
      FROM experience_records 
      WHERE id = $1 AND user_id = $2 AND is_deleted = false
    `;
    
    const experienceResult = await db.query(experienceQuery, [experienceId, currentUser.id]);
    
    if (experienceResult.rows.length === 0) {
      return ApiRouteResponse.notFound('经验记录不存在');
    }

    const experience = experienceResult.rows[0];

    // 如果已经向量化，返回成功
    if (experience.has_embedding) {
      return ApiRouteResponse.success(null, '该经验记录已经向量化');
    }

    // 创建 embedding 服务
    const embeddingService = new EmbeddingService();

    // 检查 embedding 服务是否可用
    const isAvailable = await embeddingService.isAvailable();
    if (!isAvailable) {
      return ApiRouteResponse.badRequest('向量化服务不可用，请检查 AI 配置');
    }

    // 构建要向量化的文本内容
    const textToVectorize = [
      experience.title,
      experience.problem_description,
      experience.root_cause || '',
      experience.solution,
      experience.context || ''
    ].filter(Boolean).join('\n\n');

    try {
      // 生成 embedding
      const embedding = await embeddingService.generateEmbedding(textToVectorize);

      // 更新数据库中的 embedding 和状态
      // PostgreSQL vector 类型需要数组格式，而不是字符串
      const updateQuery = `
        UPDATE experience_records 
        SET embedding = $1, has_embedding = true, updated_at = NOW()
        WHERE id = $2 AND user_id = $3
      `;

      await db.query(updateQuery, [`[${embedding.join(',')}]`, experienceId, currentUser.id]);

      return ApiRouteResponse.success(null, '向量化成功');

    } catch (embeddingError) {
      console.error('Embedding generation failed:', embeddingError);
      return ApiRouteResponse.internalError(
        `向量化失败: ${embeddingError instanceof Error ? embeddingError.message : '未知错误'}`
      );
    }

  } catch (error) {
    console.error('Error generating embedding:', error);
    return ApiRouteResponse.internalError('向量化操作失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: experienceId } = await params;

    // 获取当前用户信息
    const sessionToken = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!sessionToken) {
      return ApiRouteResponse.unauthorized('未授权访问');
    }

    const currentUser = await getCurrentUser(sessionToken);
    if (!currentUser) {
      return ApiRouteResponse.unauthorized('用户未登录');
    }

    // 检查经验记录是否存在且属于当前用户
    const experienceQuery = `
      SELECT id, has_embedding
      FROM experience_records 
      WHERE id = $1 AND user_id = $2
    `;
    
    const experienceResult = await db.query(experienceQuery, [experienceId, currentUser.id]);
    
    if (experienceResult.rows.length === 0) {
      return ApiRouteResponse.notFound('经验记录不存在');
    }

    const experience = experienceResult.rows[0];

    // 如果没有向量化，返回成功
    if (!experience.has_embedding) {
      return ApiRouteResponse.success(null, '该经验记录未向量化');
    }

    // 清除 embedding 和状态
    const updateQuery = `
      UPDATE experience_records 
      SET embedding = NULL, has_embedding = false, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
    `;

    await db.query(updateQuery, [experienceId, currentUser.id]);

    return ApiRouteResponse.success(null, '向量化数据已清除');

  } catch (error) {
    console.error('Error clearing embedding:', error);
    return ApiRouteResponse.internalError('清除向量化数据失败', 
      process.env.NODE_ENV === 'development' ? error : undefined);
  }
}