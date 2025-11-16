---
title: "Supabase RLS 策略缺失导致经验关键字无法保存"
generated_at: 2025-11-16T10:24:58Z
keywords:
  - Supabase
  - RLS
  - PostgreSQL
  - Row Level Security
  - database migration
  - TypeScript
---

## Problem Description
在使用 Recall Kit MCP 服务器提交经验记录时，经验记录本身创建成功，但关联的关键字（keywords）没有保存到数据库中。通过 MCP 查询接口也无法通过关键字检索到刚提交的经验记录。

错误表现：
- `submit_experience` 接口返回成功状态
- 经验记录 ID 正常返回
- 但 `experience_keywords` 表中没有对应的关键字记录
- 查询接口无法通过关键字找到该经验记录

## Root Cause
问题根源在于 Supabase 的 Row Level Security (RLS) 策略配置不完整。

具体原因：
1. `experience_keywords` 表启用了 RLS（Row Level Security）
2. 但只配置了 SELECT 策略，允许所有用户读取关键字
3. **缺少 INSERT 策略**，导致匿名用户无法插入关键字记录
4. 代码中的错误处理只是记录日志（`console.error`），没有抛出异常，所以经验记录创建成功，但关键字插入被静默失败

RLS 的工作原理是：如果表启用了 RLS，默认情况下会拒绝所有操作，除非有明确的策略允许该操作。由于没有 INSERT 策略，所有插入操作都被拒绝。

## Solution
1. **修复 RLS 策略**：在 `supabase/migrations/002_rls_policies.sql` 中添加 INSERT 策略
   ```sql
   CREATE POLICY "Allow anonymous users to insert keywords"
   ON experience_keywords FOR INSERT
   WITH CHECK (true);
   ```

2. **创建迁移文件**：为已部署的数据库创建新的迁移文件 `007_add_keywords_insert_policy.sql`，包含相同的策略，用于应用修复

3. **应用修复**：
   - 新部署：策略已包含在 `002_rls_policies.sql` 中
   - 现有数据库：需要运行 `007_add_keywords_insert_policy.sql` 迁移

修复后的策略允许匿名用户（通过 API）插入关键字记录，与 `experience_records` 表的策略保持一致。

## Context
- **技术栈**：Supabase (PostgreSQL), TypeScript, Row Level Security
- **项目结构**：Recall Kit 经验分享平台
- **相关表**：
  - `experience_records` - 经验记录主表（已有 INSERT 策略）
  - `experience_keywords` - 关键字关联表（缺少 INSERT 策略）
- **相关文件**：
  - `supabase/migrations/002_rls_policies.sql` - RLS 策略定义
  - `supabase/migrations/007_add_keywords_insert_policy.sql` - 修复迁移
  - `mcp-server/src/services/experienceService.ts` - 经验服务（关键字插入逻辑）

## Lessons Learned
1. **RLS 策略完整性检查**：
   - 启用 RLS 后，必须为所有需要的操作（SELECT、INSERT、UPDATE、DELETE）配置策略
   - 默认情况下，RLS 会拒绝所有未明确允许的操作
   - 相关表（如主表和关联表）的策略应该保持一致

2. **错误处理最佳实践**：
   - 不应该静默忽略关键操作的错误（如关键字插入失败）
   - 应该记录错误并抛出异常，或者至少返回明确的错误状态
   - 对于关联数据的插入失败，应该考虑事务回滚或至少给用户明确的反馈

3. **数据库迁移管理**：
   - 对于已部署的数据库，应该创建新的迁移文件而不是修改已有迁移
   - 迁移文件应该包含清晰的注释说明修复的问题
   - 建议在开发环境中先测试迁移，确保不会影响现有数据

4. **测试策略**：
   - 应该测试完整的流程，包括关联数据的创建
   - 不应该只验证主记录创建成功，还要验证关联数据是否正确保存
   - 可以编写集成测试来验证 RLS 策略的正确性

## References
- [Supabase Row Level Security Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- 相关代码文件：
  - `supabase/migrations/002_rls_policies.sql` - RLS 策略定义
  - `supabase/migrations/007_add_keywords_insert_policy.sql` - 修复迁移
  - `mcp-server/src/services/experienceService.ts:157-192` - 经验创建和关键字插入逻辑

