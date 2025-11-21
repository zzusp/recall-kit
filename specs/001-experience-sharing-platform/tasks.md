# Implementation Tasks: 经验分享平台

**Feature**: 001-experience-sharing-platform  
**Date**: 2025-01-27  
**Based on**: [plan.md](./plan.md) | [spec.md](./spec.md)

## Summary

本任务列表基于实现计划（plan.md）和功能规格（spec.md），将实现分解为可执行的任务。任务按用户故事优先级组织，支持独立实现和测试。

**Total Tasks**: 28  
**MVP Scope**: Phase 1-4 (Setup + Foundational + US1 + US2) - 17 tasks

## Task Organization

任务按以下阶段组织：
- **Phase 1**: Setup (项目初始化) - 4 tasks
- **Phase 2**: Foundational (数据库和共享代码) - 4 tasks  
- **Phase 3**: User Story 1 - MCP查询 (P1) - 5 tasks
- **Phase 4**: User Story 2 - MCP提交 (P1) - 5 tasks
- **Phase 5**: User Story 3 - Web搜索 (P2) - 4 tasks
- **Phase 6**: User Story 4 - 管理员审核 (P2) - 4 tasks
- **Phase 7**: User Story 5 - 管理后台登录 (P3) - 2 tasks
- **Phase 8**: Polish (优化和跨功能) - 1 task

## Dependencies

```
Phase 1 (Setup) 
  ↓
Phase 2 (Foundational)
  ↓
Phase 3 (US1: MCP查询) ──┐
  ↓                      │
Phase 4 (US2: MCP提交) ──┼──→ Phase 5 (US3: Web搜索)
  ↓                      │         ↓
Phase 6 (US4: 管理员审核) ┘         │
  ↓                                 │
Phase 7 (US5: 管理后台登录) ──────────┘
  ↓
Phase 8 (Polish)
```

## Phase 1: Setup (项目初始化)

### T001 [P0] 创建项目结构
**描述**: 初始化项目，创建根目录结构和配置文件  
**估时**: 2h  
**前置条件**: 无  
**验收标准**: 
- 根目录存在 `package.json`, `tsconfig.json` (可选，用于统一管理)
- 创建 `web/`, `mcp-server/`, `supabase/`, `tests/`, `docs/` 目录
- 项目结构符合架构设计

**实现路径**: 
- `package.json` (根，可选)
- `tsconfig.json` (根，可选)
- 创建各项目目录

---

### T002 [P0] 初始化PostgreSQL数据库
**描述**: 创建PostgreSQL数据库，配置连接和迁移目录  
**估时**: 1h  
**前置条件**: T001  
**验收标准**:
- `supabase/` 目录存在
- `supabase/migrations/` 目录存在
- 可以连接到PostgreSQL数据库

**实现路径**:
- `supabase/migrations/` (目录)

---

### T003 [P0] 配置开发环境工具
**描述**: 配置ESLint、Prettier、Git hooks等开发工具  
**估时**: 2h  
**前置条件**: T001  
**验收标准**:
- ESLint配置正确，可以检查代码
- Prettier配置正确，可以格式化代码
- Git hooks配置（如需要）
- 各项目都有基本的开发脚本

**实现路径**:
- `.eslintrc.js` (根)
- `.prettierrc` (根)
- 各项目的 `package.json` (scripts部分)

---

### T004 [P0] 拆分Web与MCP Server依赖管理
**描述**: 确保 `web/` 与 `mcp-server/` 各自维护独立的package管理与安装流程  
**估时**: 1h  
**前置条件**: T001  
**验收标准**:
- 根目录 `package.json` 不再声明 workspaces 或已删除模块的脚本
- `web/package.json` 与 `mcp-server/package.json` 拥有完整 scripts 与依赖
- 在 `web/`、`mcp-server/` 目录分别执行 `npm install` 均能成功
- 根目录提供可选的辅助脚本（如并行启动），但不依赖workspace特性

**实现路径**:
- `package.json` (根)
- `web/package.json`
- `mcp-server/package.json`

---

## Phase 2: Foundational (数据库和共享代码)

### T005 [P0] 创建数据库迁移 - 初始Schema
**描述**: 创建所有数据库表和基础索引（根据data-model.md）  
**估时**: 4h  
**前置条件**: T003  
**验收标准**:
- `supabase/migrations/001_initial_schema.sql` 存在
- 创建所有表：profiles, experience_records, experience_keywords, query_logs, admin_actions
- 所有字段类型和约束正确
- 迁移可以成功执行

**实现路径**:
- `supabase/migrations/001_initial_schema.sql`

---

### T006 [P0] 创建数据库迁移 - 权限策略
**描述**: 创建数据库权限策略，确保数据安全  
**估时**: 3h  
**前置条件**: T005  
**验收标准**:
- `supabase/migrations/002_rls_policies.sql` 存在
- 所有表的权限策略正确配置
- 匿名用户可以读取published记录
- 只有管理员可以更新/删除记录
- 测试验证权限策略生效

**实现路径**:
- `supabase/migrations/002_rls_policies.sql`

---

### T007 [P0] 创建数据库迁移 - 索引优化
**描述**: 创建性能优化索引（包括全文搜索索引）  
**估时**: 2h  
**前置条件**: T005  
**验收标准**:
- `supabase/migrations/003_indexes.sql` 存在
- 所有索引正确创建（包括GIN全文搜索索引）
- 索引可以提升查询性能
- 验证索引使用情况

**实现路径**:
- `supabase/migrations/003_indexes.sql`

---

### T008 [P0] 创建数据库迁移 - 初始化数据
**描述**: 创建第一个管理员账户（系统初始化）  
**估时**: 1h  
**前置条件**: T006  
**验收标准**:
- `supabase/migrations/004_seed_data.sql` 存在
- 可以创建第一个管理员账户
- 管理员账户可以正常登录
- 迁移可以成功执行

**实现路径**:
- `supabase/migrations/004_seed_data.sql`

---

## Phase 3: User Story 1 - Agent通过MCP接口查询相关经验 (P1)

### T009 [P1] [US1] 创建MCP Server项目结构
**描述**: 初始化mcp-server项目，配置TypeScript和依赖  
**估时**: 1h  
**前置条件**: T002  
**验收标准**:
- `mcp-server/package.json` 存在
- 安装MCP SDK依赖
- TypeScript配置正确
- 项目结构符合架构设计

**实现路径**:
- `mcp-server/package.json`
- `mcp-server/tsconfig.json`

---

### T010 [P1] [US1] 实现ExperienceService - 查询功能
**描述**: 实现经验记录查询服务，支持关键词搜索和排序  
**估时**: 4h  
**前置条件**: T007, T009  
**验收标准**:
- `mcp-server/src/services/experienceService.ts` 存在
- 实现 `queryExperiences()` 方法
- 支持关键词搜索（精确匹配和LIKE查询）
- 支持综合排序（相关性、查询次数、发布时间）
- 支持limit和offset分页
- 单元测试通过

**实现路径**:
- `mcp-server/src/services/experienceService.ts`
- `tests/unit/mcp-server/experienceService.test.ts`

---

### T011 [P1] [US1] 实现RankingService - 排序算法
**描述**: 实现综合排序算法，计算相关性得分  
**估时**: 3h  
**前置条件**: T010  
**验收标准**:
- `mcp-server/src/services/rankingService.ts` 存在
- 实现排序公式：`final_score = (relevance_score * 0.6) + (normalized_query_count * 0.3) + (normalized_recency * 0.1)`
- 相关性得分计算正确
- 查询次数和时间归一化正确
- 单元测试通过

**实现路径**:
- `mcp-server/src/services/rankingService.ts`
- `tests/unit/mcp-server/rankingService.test.ts`

---

### T012 [P1] [US1] 实现MCP Server查询处理器
**描述**: 实现query_experiences MCP工具处理器  
**估时**: 3h  
**前置条件**: T010, T011  
**验收标准**:
- `mcp-server/src/handlers/queryHandler.ts` 存在
- 实现MCP协议查询接口
- 请求参数验证正确
- 返回格式符合MCP Server API契约
- 错误处理完善
- 集成测试通过

**实现路径**:
- `mcp-server/src/handlers/queryHandler.ts`
- `mcp-server/src/utils/validation.ts`
- `tests/integration/mcp-server/queryHandler.test.ts`

---

### T013 [P1] [US1] 实现查询后更新query_count
**描述**: 查询返回后异步批量更新经验记录的query_count  
**估时**: 2h  
**前置条件**: T012  
**验收标准**:
- 查询接口返回结果后，异步更新返回记录的query_count (+1)
- 同时更新updated_at字段
- 更新操作不影响响应时间
- 批量更新性能良好
- 集成测试验证更新逻辑

**实现路径**:
- `mcp-server/src/services/experienceService.ts` (updateQueryCount方法)
- `tests/integration/mcp-server/queryCountUpdate.test.ts`

---

## Phase 4: User Story 2 - Agent通过MCP接口保存新经验 (P1)

### T014 [P1] [US2] 实现服务器端代码脱敏服务
**描述**: 在 MCP Server 中实现 context 字段的代码脱敏处理，防止敏感信息入库  
**估时**: 5h  
**前置条件**: T009  
**验收标准**:
- `mcp-server/src/services/sanitizerService.ts` 存在
- 支持移除API密钥、密码、token等敏感信息
- 变量名匿名化
- 移除硬编码URL和IP地址
- 移除个人信息
- 单元测试覆盖所有脱敏规则

**实现路径**:
- `mcp-server/src/services/sanitizerService.ts`
- `tests/unit/mcp-server/sanitizerService.test.ts`

---

### T015 [P1] [US2] 实现MCP Server经验总结服务
**描述**: 在服务器端集成AI总结逻辑，提取经验记录的标题、问题、根本原因与解决方案  
**估时**: 4h  
**前置条件**: T014  
**验收标准**:
- `mcp-server/src/services/summaryService.ts` 存在
- 能够根据原始输入提取问题描述、根本原因、解决方案、上下文
- 如果context包含代码，自动调用脱敏服务
- 返回格式符合 `mcp-server-api.md` 契约
- 单元测试通过

**实现路径**:
- `mcp-server/src/services/summaryService.ts`
- `tests/unit/mcp-server/summaryService.test.ts`

---

### T016 [P1] [US2] 实现AI关键字生成服务
**描述**: 集成AI服务，自动生成经验记录的关键字（MCP Server和Web项目各自实现）  
**估时**: 4h  
**前置条件**: T015  
**验收标准**:
- `mcp-server/src/services/aiService.ts` 存在
- `web/src/lib/services/aiService.ts` 存在（Web项目也需要，用于管理员编辑时生成关键字）
- 集成OpenAI/Claude API
- 根据经验内容生成关键字
- 关键字转换为小写并去除首尾空格
- 返回关键字数组
- 单元测试通过（mock AI API）

**实现路径**:
- `mcp-server/src/services/aiService.ts` (MCP Server使用)
- `web/src/lib/services/aiService.ts` (Web项目使用)
- `tests/unit/mcp-server/aiService.test.ts`
- `tests/unit/web/aiService.test.ts`

---

### T017 [P1] [US2] 实现MCP Server提交处理器
**描述**: 实现submit_experience MCP工具处理器  
**估时**: 4h  
**前置条件**: T010, T016  
**验收标准**:
- `mcp-server/src/handlers/submitHandler.ts` 存在
- 验证请求数据格式
- 验证context字段脱敏状态（如果包含代码）
- 调用AI服务生成关键字
- 保存经验记录和关键字关联
- 返回格式符合MCP Server API契约
- 集成测试通过

**实现路径**:
- `mcp-server/src/handlers/submitHandler.ts`
- `mcp-server/src/services/experienceService.ts` (createExperience方法)
- `tests/integration/mcp-server/submitHandler.test.ts`

---

### T018 [P1] [US2] 实现MCP提交端到端测试
**描述**: 针对submit_experience工具编写端到端测试，确保总结、脱敏、存储链路可靠  
**估时**: 3h  
**前置条件**: T015, T017  
**验收标准**:
- 通过MCP SDK或官方示例客户端发起提交请求
- 服务器端正确执行总结、脱敏和关键字生成流程
- 提交成功/失败返回值符合契约
- 错误处理完善
- 集成测试通过

**实现路径**:
- `tests/integration/mcp-server/submitExperience.e2e.test.ts`
- `mcp-server/src/mcp/submitHandler.ts`

---

## Phase 5: User Story 3 - 用户通过Web界面搜索和浏览经验 (P2)

### T019 [P2] [US3] 创建Next.js Web项目结构
**描述**: 初始化Next.js项目，配置TypeScript + Tailwind CSS  
**估时**: 2h  
**前置条件**: T002  
**验收标准**:
- `web/package.json` 存在
- 安装Next.js 15, React, TypeScript, Tailwind CSS等依赖
- Next.js配置正确
- Tailwind CSS配置正确
- 可以启动开发服务器

**实现路径**:
- `web/package.json`
- `web/next.config.js`
- `web/tailwind.config.js`
- `web/tsconfig.json`

---

### T020 [P2] [US3] 实现Next.js API Routes - 经验查询接口
**描述**: 实现GET /api/experiences接口（Next.js API Route）  
**估时**: 3h  
**前置条件**: T010, T019  
**验收标准**:
- `web/src/api/experiences/route.ts` 存在
- 实现GET /api/experiences接口
- 支持q、keywords、limit、offset、sort参数
- 返回格式符合Web API契约
- 支持匿名访问
- 集成测试通过

**实现路径**:
- `web/src/api/experiences/route.ts`
- `web/src/lib/services/experienceService.ts`
- `tests/integration/web/api/experiences.test.ts`

---

### T021 [P2] [US3] 实现搜索页面组件
**描述**: 实现搜索页UI，包括搜索框、结果列表、分页  
**估时**: 5h  
**前置条件**: T020  
**验收标准**:
- `web/src/app/(search)/search/page.tsx` 存在
- 搜索框可以输入关键词
- 显示搜索结果列表
- 支持分页加载更多
- 无结果时显示"未找到匹配结果"
- 响应式设计
- 组件测试通过

**实现路径**:
- `web/src/app/(search)/search/page.tsx`
- `web/src/components/search/SearchBox.tsx`
- `web/src/components/experience/ExperienceList.tsx`
- `web/src/lib/api/client.ts`
- `tests/unit/web/search/SearchPage.test.tsx`

---

### T022 [P2] [US3] 实现首页和详情页
**描述**: 实现首页（经验列表）和详情页（单个经验展示）  
**估时**: 4h  
**前置条件**: T021  
**验收标准**:
- `web/src/app/(search)/page.tsx` 存在（首页）
- `web/src/app/(search)/experience/[id]/page.tsx` 存在（详情页）
- 首页显示已发布的经验记录列表
- 详情页显示完整的经验信息
- Next.js路由配置正确
- 组件测试通过

**实现路径**:
- `web/src/app/(search)/page.tsx`
- `web/src/app/(search)/experience/[id]/page.tsx`
- `web/src/components/experience/ExperienceCard.tsx`
- `web/src/components/experience/ExperienceDetail.tsx`

---

## Phase 6: User Story 4 - 管理员审核和管理经验记录 (P2)

### T023 [P2] [US4] 实现Next.js API Routes - 管理员接口
**描述**: 实现管理员相关的API接口（编辑、删除、恢复、批量操作）  
**估时**: 5h  
**前置条件**: T020, T007 (US5需要先完成认证)  
**验收标准**:
- `web/src/api/admin/experiences/route.ts` 存在
- 实现PUT /api/admin/experiences/[id] (编辑)
- 实现DELETE /api/admin/experiences/[id] (软删除)
- 实现POST /api/admin/experiences/[id]/restore (恢复)
- 实现POST /api/admin/batch/delete (批量删除)
- 实现POST /api/admin/batch/restore (批量恢复)
- 需要管理员认证（Next.js中间件）
- 集成测试通过

**实现路径**:
- `web/src/api/admin/experiences/route.ts`
- `web/src/api/admin/experiences/[id]/route.ts`
- `web/src/api/admin/experiences/[id]/restore/route.ts`
- `web/src/api/admin/batch/delete/route.ts`
- `web/src/api/admin/batch/restore/route.ts`
- `web/src/lib/services/adminService.ts`
- `web/src/lib/middleware/auth.ts` (管理员认证中间件)
- `tests/integration/web/api/admin.test.ts`

---

### T024 [P2] [US4] 实现管理员审核页面
**描述**: 实现审核页面，包括列表、编辑、删除、批量操作功能  
**估时**: 6h  
**前置条件**: T023  
**验收标准**:
- `web/src/app/(admin)/review/page.tsx` 存在
- 显示所有经验记录（包括已删除的）
- 支持编辑记录
- 支持删除和恢复记录
- 支持批量删除和批量恢复
- 操作后刷新列表
- 组件测试通过

**实现路径**:
- `web/src/app/(admin)/review/page.tsx`
- `web/src/components/admin/review/ExperienceTable.tsx`
- `web/src/components/admin/edit/EditModal.tsx`
- `web/src/lib/api/client.ts`

---

### T025 [P2] [US4] 实现系统设置页面
**描述**: 实现系统设置页面，包括AI集成配置功能  
**估时**: 3h  
**前置条件**: T023  
**验收标准**:
- `web/src/app/(admin)/settings/page.tsx` 存在
- 支持配置AI服务（OpenAI/Claude API密钥）
- 支持配置AI服务参数
- 配置保存到数据库或环境变量
- 需要管理员认证
- 组件测试通过

**实现路径**:
- `web/src/app/(admin)/settings/page.tsx`
- `web/src/components/admin/settings/AIConfigForm.tsx`
- `web/src/lib/services/settingsService.ts`
- `web/src/api/admin/settings/route.ts`

---

## Phase 7: User Story 5 - 管理后台登录和后台管理 (P3)

### T026 [P3] [US5] 实现管理员认证
**描述**: 实现基于JWT的管理后台登录功能（Next.js API Route）  
**估时**: 4h  
**前置条件**: T008  
**验收标准**:
- `web/src/api/auth/login/route.ts` 存在
- 实现POST /api/auth/login接口
- 使用JWT验证用户
- 检查用户角色是否为admin
- 返回JWT token
- 实现认证中间件（Next.js middleware）
- 集成测试通过

**实现路径**:
- `web/src/api/auth/login/route.ts`
- `web/src/lib/middleware/auth.ts` (Next.js middleware)
- `web/src/lib/services/authService.ts`
- `web/middleware.ts` (Next.js中间件入口)
- `tests/integration/web/api/auth.test.ts`

---

### T027 [P3] [US5] 实现管理后台登录页面和控制面板
**描述**: 实现登录页面和管理员控制面板  
**估时**: 4h  
**前置条件**: T026  
**验收标准**:
- `web/src/app/(admin)/login/page.tsx` 存在
- `web/src/app/(admin)/dashboard/page.tsx` 存在
- 登录页面可以输入邮箱和密码
- 登录成功后跳转到控制面板
- 控制面板显示统计信息
- 路由保护（Next.js middleware，未登录跳转到登录页）
- 组件测试通过

**实现路径**:
- `web/src/app/(admin)/login/page.tsx`
- `web/src/app/(admin)/dashboard/page.tsx`
- `web/src/components/admin/dashboard/StatsCard.tsx`
- `web/src/stores/authStore.ts` (Zustand)
- `web/middleware.ts` (路由保护)

---

## Phase 8: Polish (优化和跨功能)

### T028 [P2] 实现查询日志记录
**描述**: 记录所有MCP和Web查询请求到query_logs表  
**估时**: 2h  
**前置条件**: T012, T020  
**验收标准**:
- MCP查询请求记录到query_logs表
- Web查询请求记录到query_logs表
- 记录包含查询关键词、结果数量、响应时间、经验ID列表
- 异步记录，不影响查询性能
- 可以查询日志进行统计分析

**实现路径**:
- `mcp-server/src/services/queryLogService.ts`
- `web/src/lib/services/queryLogService.ts`
- `mcp-server/src/handlers/queryHandler.ts` (集成日志)
- `web/src/api/experiences/route.ts` (集成日志)

---

## Parallel Execution Opportunities

### Phase 3 (US1) 可以并行执行:
- T010 和 T011 可以并行（不同服务文件）
- T012 依赖 T010 和 T011，但可以同时开发测试

### Phase 4 (US2) 可以并行执行:
- T014 和 T016 可以并行（不同服务）
- T015 依赖 T014，T017 依赖 T016

### Phase 5 (US3) 可以并行执行:
- T020 和 T021 可以并行（API Route和页面组件）
- T022 可以独立开发

### Phase 6 (US4) 可以并行执行:
- T023、T024 和 T025 可以并行（API Routes和页面组件）

## Independent Test Criteria

### User Story 1 (MCP查询):
- 安装MCP Client后，Agent可以发起查询请求
- MCP Server返回相关的经验记录列表
- 结果按综合排序规则排列
- 支持limit和offset参数

### User Story 2 (MCP提交):
- Agent可以总结经验并提示用户确认
- 用户确认后，经验记录被保存并自动发布
- context字段中的代码片段已脱敏
- 关键字自动生成

### User Story 3 (Web搜索):
- 用户可以匿名访问网站
- 可以搜索和浏览经验记录
- 搜索结果正确显示
- 无结果时显示提示信息

### User Story 4 (管理员审核):
- 管理员可以登录并访问管理页面
- 可以编辑、删除、恢复经验记录
- 支持批量操作

### User Story 5 (管理后台登录):
- 管理员可以登录
- 登录后可以访问后台管理功能
- 未登录用户无法访问管理页面

## MVP Scope

**建议MVP范围**: Phase 1-4 (Setup + Foundational + US1 + US2)

**MVP包含任务**: T001-T018 (17个任务，包含T004)

**MVP交付价值**:
- 完整的MCP查询和提交功能
- Agent可以通过MCP Client查询和保存经验
- 数据库和基础架构完整
- 核心功能可独立测试和使用

**后续迭代**:
- Phase 5-7: Web界面和管理功能
- Phase 8: 优化和监控

## Implementation Strategy

1. **MVP优先**: 先完成核心MCP功能（US1 + US2），确保平台核心价值可用
2. **增量交付**: 每个用户故事完成后都可以独立测试和交付价值
3. **并行开发**: 充分利用并行机会，加快开发速度
4. **测试驱动**: 每个任务都包含验收标准和测试要求
5. **持续集成**: 每个阶段完成后进行集成测试，确保系统稳定

