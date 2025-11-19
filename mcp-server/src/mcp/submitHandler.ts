export interface SubmitExperienceParams {
  title: string;
  problem_description: string;
  root_cause?: string;
  solution: string;
  context?: string;
  keywords?: string[];
}

export interface SubmitExperienceResult {
  experience_id: string;
  status: 'success' | 'failed';
  error?: string;
}

export interface SubmitContext {
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  apiKey?: string;
}

export interface SubmitHandlerOptions {
  embeddingService?: any;
}

import { sql } from '../lib/db/config';
import { randomUUID } from 'crypto';
import { validateApiKey, ApiKeyValidationResult } from '../services/apiKeyService';

export async function initSubmitHandler(
  options?: SubmitHandlerOptions,
) {

  return async function submitHandler(
    params: SubmitExperienceParams,
    context?: SubmitContext
  ): Promise<SubmitExperienceResult> {
    try {
      const {
        title,
        problem_description,
        root_cause,
        solution,
        context: experienceContext,
        keywords = []
      } = params;

      console.log('Processing experience submission');

      // 验证API密钥
      let userId: string | null = null;
      if (context?.apiKey) {
        const validation: ApiKeyValidationResult = await validateApiKey(context.apiKey);
        if (!validation.isValid) {
          return {
            experience_id: '',
            status: 'failed',
            error: validation.error || 'Invalid API key'
          };
        }
        userId = validation.apiKeyInfo!.user_id;
        console.log('API key validated successfully for user:', userId);
      } else {
        return {
          experience_id: '',
          status: 'failed',
          error: 'API key is required for experience submission'
        };
      }

      // 验证必填字段
      if (!title || !problem_description || !solution) {
        const errorMessage = 'Missing required fields: title, problem_description, solution';
        throw new Error(errorMessage);
      }

      // 验证标题长度
      if (title.length > 500) {
        const errorMessage = 'Title must be 500 characters or less';
        throw new Error(errorMessage);
      }

      // 验证上下文（如果提供）
      if (experienceContext && experienceContext.length > 10000) {
        const errorMessage = 'Context must be 10000 characters or less';
        throw new Error(errorMessage);
      }

      // 验证关键词数量
      if (keywords.length < 3) {
        const errorMessage = 'At least 3 keywords are required';
        throw new Error(errorMessage);
      }

      const experienceId = randomUUID();

      try {
        // Use sql.begin for proper transaction handling
        await sql.begin(async (sql) => {
          // 插入经验记录
          const insertQuery = `
            INSERT INTO experience_records (
              id, user_id, title, problem_description, root_cause, solution, 
              context, publish_status, is_deleted, query_count, relevance_score, created_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, 'published', false, 0, 0, NOW()
            )
            RETURNING id
          `;
          
          await sql.unsafe(insertQuery, [
            experienceId,
            userId,
            title,
            problem_description,
            root_cause || null,
            solution,
            experienceContext || null
          ]);

          // 插入关键词
          if (keywords.length > 0) {
            for (const keyword of keywords) {
              await sql`INSERT INTO experience_keywords (experience_id, keyword) VALUES (${experienceId}, ${keyword})`;
            }
          }

          // 生成嵌入向量（如果服务可用）
          if (options?.embeddingService) {
            const isAvailable = await options.embeddingService.isAvailable();
            if (isAvailable) {
              try {
                const embedding = await options.embeddingService.generateExperienceEmbedding({
                  title,
                  problem_description,
                  root_cause,
                  solution,
                  context: experienceContext,
                  keywords
                });

                if (embedding && embedding.length > 0) {
                  // 更新嵌入向量 - 使用正确的向量格式
                  const embeddingVector = `[${embedding.join(',')}]`;
                  await sql`UPDATE experience_records 
                            SET embedding = ${embeddingVector}::vector, has_embedding = true
                            WHERE id = ${experienceId}`;
                } else {
                  // 如果嵌入生成失败，仍然发布记录，但标记为无嵌入
                  await sql`UPDATE experience_records 
                            SET has_embedding = false
                            WHERE id = ${experienceId}`;
                }
              } catch (embeddingError) {
                console.warn('Failed to generate embedding for experience:', embeddingError);
                // 即使嵌入失败，也发布记录，但标记为无嵌入
                await sql`UPDATE experience_records 
                          SET has_embedding = false
                          WHERE id = ${experienceId}`;
              }
            }
          }

        });

        console.log('Experience submitted successfully:', experienceId);

        return {
          experience_id: experienceId,
          status: 'success'
        };

      } catch (dbError) {
        
        throw dbError;
      }

    } catch (error) {
      console.error('Submit handler error:', error);
      
      return {
        experience_id: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Failed to submit experience'
      };
    }
  };
}