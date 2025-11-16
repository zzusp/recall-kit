# 向量搜索功能使用指南

## 概述

本项目已集成 Supabase 的向量搜索功能，支持基于语义相似度的智能搜索。向量搜索使用 OpenAI 的 embedding 模型将文本转换为向量，然后通过 pgvector 扩展进行相似度匹配。

## 功能特点

- ✅ **语义搜索**：理解查询意图，而非仅关键词匹配
- ✅ **自动降级**：如果向量搜索不可用，自动回退到全文搜索
- ✅ **自动生成**：创建新经验记录时自动生成 embedding
- ✅ **批量更新**：支持为现有记录批量生成 embedding

## 配置要求

### 1. 环境变量

在 `.env.local` 或 `.env` 文件中添加：

```env
OPENAI_API_KEY=sk-your-openai-api-key
```

### 2. 数据库迁移

确保已执行以下迁移：
- `008_add_vector_search.sql` - 添加向量搜索支持

## 使用方法

### 搜索功能

向量搜索已自动集成到搜索功能中。当满足以下条件时，会自动使用向量搜索：

1. 提供了搜索查询（`q` 参数）
2. OpenAI API Key 已配置
3. 数据库中存在 embedding 数据

如果向量搜索不可用或失败，会自动回退到全文搜索（ILIKE）。

### 为现有记录生成 Embedding

#### 方法 1：通过 API（推荐）

```bash
# 为单个经验记录生成 embedding
POST /api/experiences/{id}/embedding

# 批量生成 embedding（管理员权限）
POST /api/admin/experiences/generate-embeddings?limit=10&offset=0
```

#### 方法 2：通过代码

```typescript
import { ExperienceService } from '@/lib/services/experienceService';

const experienceService = new ExperienceService();

// 为单个记录生成 embedding
await experienceService.updateExperienceEmbedding(experienceId);

// 批量生成（需要自己实现循环）
```

### 新记录自动生成

新创建的经验记录会自动生成 embedding（如果 OpenAI API Key 已配置）。这发生在：

- MCP Server 提交新经验时
- Web 端创建新经验时（如果实现了创建功能）

## API 端点

### 1. 生成单个记录的 Embedding

**端点**: `POST /api/experiences/[id]/embedding`

**权限**: 公开（建议添加认证）

**响应**:
```json
{
  "success": true,
  "message": "Embedding updated successfully"
}
```

### 2. 批量生成 Embedding

**端点**: `GET /api/admin/experiences/generate-embeddings`

**权限**: 管理员

**查询参数**:
- `limit`: 每次处理的记录数（默认 10）
- `offset`: 偏移量（默认 0）

**响应**:
```json
{
  "success": true,
  "message": "Processed 10 experiences",
  "processed": 10,
  "successCount": 10,
  "failCount": 0
}
```

## 搜索行为

### 向量搜索流程

1. 检查是否有搜索查询
2. 检查 OpenAI API Key 是否配置
3. 为查询文本生成 embedding
4. 调用数据库 RPC 函数进行向量相似度搜索
5. 如果找到结果，返回按相似度排序的结果
6. 如果失败或没有结果，回退到全文搜索

### 相似度阈值

默认相似度阈值为 `0.7`（70%），可以在 `ExperienceService.queryByVector` 方法中调整。

## 性能优化

- **HNSW 索引**：使用 HNSW 算法创建的高效向量索引
- **异步生成**：embedding 生成不阻塞主要流程
- **错误处理**：完善的错误处理和降级机制

## 注意事项

1. **API 成本**：每次生成 embedding 都会调用 OpenAI API，产生费用
2. **存储空间**：向量数据占用较多存储空间（每个 embedding 约 6KB）
3. **生成时间**：生成 embedding 需要时间，建议异步处理
4. **API 限制**：注意 OpenAI API 的速率限制

## 故障排查

### 向量搜索不工作

1. 检查 OpenAI API Key 是否配置
2. 检查数据库迁移是否已执行
3. 检查记录是否有 embedding 数据
4. 查看控制台错误日志

### Embedding 生成失败

1. 检查 OpenAI API Key 是否有效
2. 检查网络连接
3. 检查 API 配额和限制
4. 查看详细错误日志

## 未来改进

- [ ] 支持其他 embedding 模型（Cohere, Hugging Face 等）
- [ ] 实现混合搜索（向量 + 全文搜索）
- [ ] 添加相似度分数显示
- [ ] 优化批量生成性能

