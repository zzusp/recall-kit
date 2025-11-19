# Implementation Plan: 经验分享平台

**Branch**: `001-experience-sharing-platform` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-experience-sharing-platform/spec.md`

## Summary

构建一个经验分享平台，通过MCP协议让Agent自动查询和保存与AI交互的经验，减少重复对话和token浪费。平台包含三个核心模块：检索模块（Web界面）、管理模块（后台管理，和检索共用Next.js应用）、MCP Server（Agent端API服务）。技术栈采用Node.js + Next.js 15 (全栈) + Supabase，实现全栈应用。

## Technical Context

**Language/Version**: 
- Node.js 20.x LTS
- TypeScript 5.x
- Next.js 15.x (App Router)
- React 18.x

**Primary Dependencies**: 
- **Web项目**: Next.js 15.x, React 18.x, TypeScript 5.x, Tailwind CSS 3.x, Zustand 4.x, @supabase/supabase-js 2.x
- **MCP Server**: Node.js 20.x, TypeScript 5.x, MCP SDK, @supabase/supabase-js 2.x, Express.js 4.x
- **数据库**: Supabase (PostgreSQL 15+)
- **AI服务**: OpenAI API / Anthropic Claude API (用于经验总结和查询优化)
- **数据脱敏**: 自定义脱敏服务（基于正则表达式和AST解析）

**Storage**: Supabase PostgreSQL 15+ (包含PostgREST API和实时订阅)

**Testing**: 
- **Web项目**: Jest + React Testing Library + Playwright (Next.js内置测试支持)
- **MCP Server**: Jest + Supertest
- **E2E**: Playwright

**Target Platform**: 
- Web应用（浏览器）
- Node.js运行时（MCP Server）

**Project Type**: Web application (frontend + backend + MCP services)

**Performance Goals**: 
- MCP查询响应时间：90%请求在2秒内返回
- Web搜索响应时间：1秒内显示结果
- 支持1000个并发MCP查询请求
- 支持10万条经验记录存储

**Constraints**: 
- 所有用户数据必须匿名访问（MCP和Web界面）
- 代码片段必须自动脱敏
- 免费使用，无配额限制
- 必须支持软删除和恢复

**Scale/Scope**: 
- 初期：1000+用户，10万条经验记录
- 扩展性：支持水平扩展（Supabase自动扩展）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### 架构原则检查

- ✅ **模块化设计**: 三个模块（检索/管理Web应用、MCP Server、Supabase）清晰分离
- ✅ **技术栈一致性**: 统一使用TypeScript，前后端类型共享
- ✅ **数据安全**: Supabase RLS策略 + 代码脱敏处理
- ✅ **性能优化**: 数据库索引优化 + 前端懒加载 + 查询结果分页

### 代码规范检查

- ✅ **命名规范**: 
  - 前端组件：PascalCase (如 `ExperienceCard.tsx`)
  - 后端服务：camelCase (如 `experienceService.ts`)
  - 数据库表：snake_case复数 (如 `experience_records`)
  - API路由：RESTful风格 (如 `/api/experiences`)

### 技术栈要求检查

- ✅ **Web项目**: Next.js 15.x (App Router) + TypeScript + Tailwind CSS
- ✅ **MCP Server**: Node.js + Express + Supabase
- ✅ **数据库**: Supabase PostgreSQL
- ✅ **认证**: Supabase Auth (仅管理员)

**Gate Status**: ✅ PASSED

## Project Structure

### Documentation (this feature)

```text
specs/001-experience-sharing-platform/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (技术选型和最佳实践)
├── data-model.md        # Phase 1 output (数据库表结构设计)
├── quickstart.md        # Phase 1 output (快速开始指南)
└── contracts/           # Phase 1 output (API契约文档)
    ├── mcp-server-api.md
    └── web-api.md
```

### Source Code (repository root)

```text
recall-kit/
├── web/                          # Web项目（Next.js全栈）
│   ├── src/
│   │   ├── app/                  # Next.js App Router
│   │   │   ├── (search)/         # 检索模块路由组（面向用户）
│   │   │   │   ├── page.tsx      # 首页
│   │   │   │   ├── search/       # 搜索页
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── list/         # 列表页
│   │   │   │   │   └── page.tsx
│   │   │   │   └── experience/   # 详情页
│   │   │   │       └── [id]/
│   │   │   │           └── page.tsx
│   │   │   └── (admin)/          # 管理模块路由组（管理员后台）
│   │   │       ├── login/        # 登录页
│   │   │       │   └── page.tsx
│   │   │       ├── dashboard/    # 控制面板
│   │   │       │   └── page.tsx
│   │   │       ├── review/       # 审核页
│   │   │       │   └── page.tsx
│   │   │       ├── edit/         # 编辑页
│   │   │       │   └── [id]/
│   │   │       │       └── page.tsx
│   │   │       └── settings/     # 设置页
│   │   │           └── page.tsx
│   │   │
│   │   ├── components/           # React组件
│   │   │   ├── search/           # 检索模块组件
│   │   │   │   ├── SearchBox.tsx
│   │   │   │   ├── ExperienceList.tsx
│   │   │   │   └── ExperienceCard.tsx
│   │   │   ├── admin/            # 管理模块组件
│   │   │   │   ├── Dashboard/
│   │   │   │   ├── Review/
│   │   │   │   ├── Edit/
│   │   │   │   └── Settings/
│   │   │   └── common/           # 共享组件
│   │   │
│   │   ├── lib/                  # 工具函数和配置
│   │   │   ├── api/              # API客户端
│   │   │   │   └── client.ts
│   │   │   ├── services/         # 业务逻辑服务
│   │   │   │   ├── experienceService.ts
│   │   │   │   ├── adminService.ts
│   │   │   │   └── aiService.ts
│   │   │   ├── utils/
│   │   │   └── supabase/         # Supabase客户端配置
│   │   │       └── client.ts
│   │   │
│   │   ├── stores/               # Zustand状态管理
│   │   │   ├── experienceStore.ts
│   │   │   └── authStore.ts
│   │   │
│   │   ├── types/                # TypeScript类型定义
│   │   │   ├── experience.ts
│   │   │   ├── user.ts
│   │   │   └── api.ts
│   │   │
│   │   └── api/                  # Next.js API Routes（后端API）
│   │       ├── experiences/      # 经验记录API
│   │       │   ├── route.ts      # GET /api/experiences
│   │       │   └── [id]/
│   │       │       └── route.ts  # GET /api/experiences/[id]
│   │       ├── admin/            # 管理员API
│   │       │   ├── experiences/
│   │       │   │   ├── route.ts  # GET/POST /api/admin/experiences
│   │       │   │   └── [id]/
│   │       │   │       ├── route.ts      # PUT/DELETE /api/admin/experiences/[id]
│   │       │   │       └── restore/
│   │       │   │           └── route.ts  # POST /api/admin/experiences/[id]/restore
│   │       │   └── batch/
│   │       │       ├── delete/
│   │       │       │   └── route.ts      # POST /api/admin/batch/delete
│   │       │       └── restore/
│   │       │           └── route.ts      # POST /api/admin/batch/restore
│   │       └── auth/             # 认证API
│   │           └── login/
│   │               └── route.ts  # POST /api/auth/login
│   │
│   ├── public/                   # 静态资源
│   ├── next.config.js            # Next.js配置
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── mcp-server/                   # MCP Server项目（独立项目）
│   ├── src/
│   │   ├── mcp/                  # MCP协议处理器
│   │   │   ├── queryHandler.ts   # 查询请求处理
│   │   │   ├── submitHandler.ts  # 提交请求处理
│   │   │   └── index.ts          # MCP入口
│   │   ├── services/             # 业务逻辑服务
│   │   │   ├── experienceService.ts
│   │   │   ├── rankingService.ts
│   │   │   └── aiService.ts      # AI服务（关键字生成）
│   │   ├── http/                 # 可选HTTP接口（Express）
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   └── services/
│   │   ├── utils/                # 工具函数
│   │   ├── types/                # TypeScript类型定义
│   │   └── index.ts              # 入口文件
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
│
├── supabase/                     # Supabase配置和迁移（共享）
│   ├── migrations/               # 数据库迁移文件
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rls_policies.sql
│   │   ├── 003_indexes.sql
│   │   └── 004_seed_data.sql
│   ├── functions/                # Edge Functions (如需要)
│   └── config.toml
│
├── tests/                        # 测试文件
│   ├── unit/                     # 单元测试
│   ├── integration/              # 集成测试
│   └── e2e/                      # 端到端测试
│
├── docs/                         # 文档
│   ├── api/                      # API文档
│   ├── deployment/               # 部署文档
│   └── user-guide/               # 用户指南
│
├── prototypes/                   # 页面原型（参考）
│   ├── demo.html
│   └── backend_demo.html
│
├── package.json                  # 根package.json（可选，用于统一管理）
├── pnpm-workspace.yaml           # pnpm workspace配置（可选）
├── tsconfig.json                 # 根TypeScript配置（可选）
└── README.md
```

**Structure Decision**: 采用多项目结构，包含三个独立项目：
1. **`web/`** - Web项目（前端+后端），包含search和admin两个应用模块
2. **`mcp-server/`** - MCP Server项目（独立服务），包含MCP协议处理和自己的后端服务
每个项目独立维护自己的类型定义和工具函数，可以独立开发、测试、打包和部署。根目录的聚合脚本仅作为开发便利，不再使用monorepo workspace。

**架构说明**: 
- **`web/`** 是Next.js全栈项目，包含：
  - `src/app/` - Next.js App Router页面（包含search和admin两个路由组）
  - `src/api/` - Next.js API Routes（后端API，替代独立的Express服务）
  - `src/components/` - React组件
  - `src/lib/` - 业务逻辑服务和工具函数
  - 使用Next.js内置的API Routes提供后端服务，无需独立的Express服务器
- **`mcp-server/`** 是独立的MCP Server项目，包含：
  - MCP协议处理器
  - 自己的后端服务和业务逻辑（Express.js）
  - 独立部署和运行
- **`supabase/`** 是共享的数据库配置，Web项目和MCP Server项目都使用同一个数据库
- 两个项目（web和mcp-server）可以独立开发、测试和部署，通过共享数据库进行数据交互

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| 4个独立前端包 | 检索和管理模块有不同的用户群体和功能需求，需要独立部署和扩展 | 合并为一个包会导致代码耦合，不利于独立开发和部署 |
| MCP Server与Web分离 | MCP协议服务需要独立扩展，部署策略不同 | 合并会导致耦合增加，难以按需扩缩 |

## Phase 0: Research & Technology Decisions

### Research Tasks

1. **MCP协议实现研究**
   - 研究Model Context Protocol (MCP)的标准实现
   - 确定Node.js MCP SDK的选择
   - 设计MCP Server与官方/第三方客户端的兼容策略

2. **Supabase最佳实践**
   - 研究Supabase RLS策略设计
   - 优化PostgreSQL查询性能
   - 设计实时订阅机制（如需要）

3. **代码脱敏技术研究**
   - 研究代码AST解析和脱敏算法
   - 确定敏感信息识别规则
   - 设计脱敏服务架构

4. **AI服务集成研究**
   - 研究OpenAI/Claude API集成
   - 设计经验总结和查询优化的AI服务
   - 确定标签自动生成的实现方案

5. **Next.js全栈开发最佳实践**
   - 研究Next.js 15 App Router架构
   - 确定状态管理方案（Zustand）
   - 设计API Routes和页面路由结构
   - 研究Next.js与Supabase集成方案

### Technology Decisions

**Decision**: web与mcp-server各自维护独立的npm项目
**Rationale**: 降低workspace复杂度，简化依赖管理，便于分开部署
**Alternatives considered**: 使用pnpm/npm workspaces统一管理 - 但需要额外的workspace配置，且当前模块数量较少

**Decision**: 使用Supabase作为BaaS
**Rationale**: 提供PostgreSQL数据库、认证、实时订阅，减少后端开发工作量
**Alternatives considered**: 自建PostgreSQL + Express - Supabase提供开箱即用的功能，开发效率更高

**Decision**: 使用Zustand进行状态管理
**Rationale**: 轻量级，TypeScript友好，适合中小型应用
**Alternatives considered**: Redux, Context API - Zustand更简单，性能更好

**Decision**: 使用TanStack Query进行数据获取
**Rationale**: 自动缓存、重试、后台更新，减少样板代码
**Alternatives considered**: SWR, 原生fetch - TanStack Query功能更全面

## Phase 1: Design & Contracts

### Data Model

✅ **已完成** - 详见 [data-model.md](./data-model.md)

包含7个核心表：
- `profiles`: 用户扩展信息
- `experience_records`: 经验记录（核心表）
- `experience_keywords`: 经验关键字
- `query_logs`: 查询日志
- `admin_actions`: 管理员操作日志

**Note**: 本版本不包含版本管理功能。

### API Contracts

✅ **已完成** - 详见 [contracts/](./contracts/) 目录

包含3个API契约文档：
- `mcp-server-api.md`: MCP Server API规范
- `web-api.md`: Web API RESTful规范

### Quick Start Guide

✅ **已完成** - 详见 [quickstart.md](./quickstart.md)

包含项目初始化、开发环境设置、构建和部署指南。

### Research & Technology Decisions

✅ **已完成** - 详见 [research.md](./research.md)

包含10个关键技术决策的研究过程和理由。
