<!--
Sync Impact Report:
Version change: 0.0.0 → 1.0.0
Modified principles: 
- Added Next.js优先架构 (I. Next.js 优先架构)
- Added 测试驱动开发 (II. 测试驱动开发)
- Added 数据安全与合规 (III. 数据安全与合规)
- Added 性能与可扩展性 (IV. 性能与可扩展性)
- Added 代码质量与一致性 (V. 代码质量与一致性)
Added sections:
- 代码规范 (详细的方法、字段、接口、数据库命名规范)
- 技术栈要求 (前端、后端、开发工具)
- 开发工作流 (代码审查、质量门禁、部署流程)
Templates requiring updates:
✅ .specify/memory/constitution.md (updated)
⚠️ .specify/templates/plan-template.md (needs Next.js specific updates)
⚠️ .specify/templates/spec-template.md (needs game-specific user story templates)
⚠️ .specify/templates/tasks-template.md (needs Next.js/React task patterns)
Follow-up TODOs: None - all placeholders resolved
-->

# Project Constitution

## 核心原则

### I. Next.js 优先架构
所有前端功能必须基于 Next.js 15.x 最新稳定版本构建；使用 App Router 架构；组件必须支持服务端渲染(SSR)和静态生成(SSG)；API路由必须遵循RESTful设计原则；所有页面组件必须支持TypeScript类型检查。

### II. 数据安全与合规
所有敏感数据必须通过Supabase加密存储；AI API密钥不得暴露给前端；管理员操作必须记录审计日志；数据库访问必须使用行级安全策略(RLS)。

### III. 性能与可扩展性
数据库查询必须优化索引；前端组件必须支持懒加载；图片资源必须使用Next.js Image组件优化。

### IV. 代码质量与一致性
所有代码必须遵循ESLint和Prettier规范；组件必须使用函数式编程范式；状态管理必须使用Zustand或React Context；所有异步操作必须使用async/await；错误处理必须使用try-catch包装。

## 代码规范

### 方法命名规范
- **函数命名**：使用camelCase命名法，名称必须以动词开头，清晰描述函数功能
- **React Hooks**：必须以use开头，如useGameState、usePlayerData
- **事件处理函数**：必须以handle开头，如handlePlayerChoice、handleGameStart
- **工具函数**：必须以动词开头，如calculateScore、validateInput、formatDate

### 字段命名规范
- **变量命名**：使用camelCase命名法，名称必须具有描述性
- **常量命名**：使用SCREAMING_SNAKE_CASE命名法，如MAX_SCORE、API_BASE_URL
- **组件Props**：使用camelCase命名法，如playerData、gameState、onChoiceSelect
- **状态变量**：使用camelCase命名法，如currentScene、playerScore、isGameActive

### 接口命名规范
- **TypeScript接口**：使用PascalCase命名法，以I开头，如IPlayerData、IGameState、ISceneNode
- **API接口**：使用PascalCase命名法，如PlayerResponse、GameStateResponse、SceneNodeResponse
- **数据库模型**：使用PascalCase命名法，如Player、GameSession、SceneNode

### 数据库表名列名命名规范
- **表名**：使用snake_case命名法，使用复数形式，如players、game_sessions、scene_nodes、player_choices
- **列名**：使用snake_case命名法，如player_id、game_session_id、scene_id、choice_text、score_impact
- **外键**：使用被引用表名_id格式，如player_id、game_session_id、scene_id
- **时间戳**：使用created_at、updated_at、deleted_at格式

### 文件和目录命名规范
- **目录命名**：使用kebab-case命名法，如game-engine、ai-service、database-models
- **组件文件**：使用PascalCase命名法，如PlayerProfile.tsx、GameBoard.tsx、SceneNode.tsx
- **工具文件**：使用camelCase命名法，如gameUtils.ts、aiService.ts、databaseService.ts
- **类型文件**：使用camelCase命名法，如gameTypes.ts、playerTypes.ts、sceneTypes.ts

## 技术栈要求

### 前端技术栈
- **框架**：Next.js 15.x (App Router)
- **语言**：TypeScript 5.x
- **状态管理**：Zustand 4.x
- **样式**：Tailwind CSS 3.x
- **UI组件**：Radix UI + shadcn/ui
- **测试**：Jest + React Testing Library + Playwright

### 后端技术栈
- **数据库**：Supabase (PostgreSQL 15+)
- **认证**：Supabase Auth
- **API**：Next.js API Routes
- **AI集成**：OpenAI API / Anthropic Claude API
- **缓存**：不需要
- **部署**：Vercel / Docker

### 开发工具
- **代码格式化**：Prettier + ESLint
- **Git钩子**：Husky + lint-staged
- **包管理**：pnpm
- **版本控制**：Git + GitHub Actions

## 开发工作流

### 代码审查要求
- 代码覆盖率不得低于80%
- 所有TypeScript类型错误必须修复
- 所有ESLint警告必须处理
- 所有测试必须通过

### 质量门禁
- 端到端测试覆盖率：≥40%
- 性能测试：页面加载时间≤3秒
- 安全扫描：无高危漏洞

### 部署流程
- 开发环境：自动部署到Vercel预览
- 测试环境：手动部署到测试服务器

**Version**: 1.0.0 | **Ratified**: 2025-11-13 | **Last Amended**: 2025-11-13
