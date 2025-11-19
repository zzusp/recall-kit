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
}

export interface SubmitHandlerOptions {
  embeddingService?: any;
}

import { sql } from '../lib/db/config';
import { randomUUID } from 'crypto';

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
        // Start transaction
        await sql`BEGIN`;

        // 插入经验记录
        const insertQuery = `
          INSERT INTO experience_records (
            id, title, problem_description, root_cause, solution, 
            context, status, query_count, relevance_score, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, 'pending', 0, 0, NOW()
          )
          RETURNING id
        `;
        
        await sql.unsafe(insertQuery, [
          experienceId,
          title,
          problem_description,
          root_cause || null,
          solution,
          experienceContext || null
        ]);

        // 插入关键词
        if (keywords.length > 0) {
          const keywordInserts = keywords.map(keyword => 
            sql`INSERT INTO experience_keywords (experience_id, keyword) VALUES (${experienceId}, ${keyword})`
          );
          await sql.begin(async (sql) => {
            for (const insert of keywordInserts) {
              await insert;
            }
          });
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
                // 更新嵌入向量
                await sql`UPDATE experience_records 
                          SET embedding = ${embedding}, status = 'published'
                          WHERE id = ${experienceId}`;
              } else {
                // 如果嵌入生成失败，仍然发布记录
                await sql`UPDATE experience_records 
                          SET status = 'published'
                          WHERE id = ${experienceId}`;
              }
            } catch (embeddingError) {
              console.warn('Failed to generate embedding for experience:', embeddingError);
              // 即使嵌入失败，也发布记录
              await sql`UPDATE experience_records 
                        SET status = 'published'
                        WHERE id = ${experienceId}`;
            }
          } else {
            // 如果嵌入服务不可用，直接发布
            await sql`UPDATE experience_records 
                      SET status = 'published'
                      WHERE id = ${experienceId}`;
          }
        } else {
          // 如果没有嵌入服务，直接发布
          await sql`UPDATE experience_records 
                    SET status = 'published'
                    WHERE id = ${experienceId}`;
        }

        // 提交事务
        await sql`COMMIT`;

        console.log('Experience submitted successfully:', experienceId);

        return {
          experience_id: experienceId,
          status: 'success'
        };

      } catch (dbError) {
        // 回滚事务
        await sql`ROLLBACK`;
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