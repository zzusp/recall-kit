---
title: "Next.js 路由冲突导致404错误：路由组与顶级路由的路径冲突"
generated_at: 2025-11-24T16:32:50Z
keywords:
    - Next.js
    - 路由冲突
    - 404错误
    - Route Groups
    - TypeScript
---

## Problem Description

在 Next.js 15 应用中，用户点击热门经验列表中的链接时，跳转到 `/experience/[id]` 路径后显示404错误。同时在构建时出现路由冲突错误：

```
Build Error: You cannot have two parallel pages that resolve to the same path. 
Please check /(search)/experience/[id]/page and /experience/[id]/page.
```

具体表现：
1. 链接生成正确：`href="/experience/cf3d9a04-6bbd-4cf5-af70-236dc435244e"`
2. 点击后显示404页面
3. 构建失败，提示路由冲突

## Root Cause

**主要原因**：Next.js 不允许两个不同的页面路由解析到相同的路径

项目中同时存在两个路由文件：
- `web/src/app/(search)/experience/[id]/page.tsx` - 路由组内的路由
- `web/src/app/experience/[id]/page.tsx` - 顶级路由

在 Next.js 的路由系统中：
- `(search)` 是一个路由组（Route Group），用于组织路由但不影响URL路径
- 路由组内的 `(search)/experience/[id]/page.tsx` 解析为 `/experience/[id]`
- 顶级的 `experience/[id]/page.tsx` 也解析为 `/experience/[id]`
- 两者产生路径冲突，导致构建失败和404错误

**次要原因**：项目中的链接指向错误

部分代码中链接指向 `/search/experience/[id]`，但实际应该指向 `/experience/[id]`：
```tsx
// 错误的链接
<Link href={`/search/experience/${experience.id}`}>

// 正确的链接
<Link href={`/experience/${experience.id}`}>
```

## Solution

### 步骤1：删除冲突的路由文件

删除路由组内的冲突文件，保留顶级路由：
```bash
# 删除
web/src/app/(search)/experience/[id]/page.tsx

# 保留
web/src/app/experience/[id]/page.tsx
```

### 步骤2：修复所有错误的链接指向

修改所有相关组件的链接路径：

**用户仪表盘页面** (`web/src/app/admin/user-dashboard/page.tsx`)：
```tsx
// 修改前
<Link href={`/search/experience/${experience.id}`}>

// 修改后
<Link href={`/experience/${experience.id}`}>
```

**经验列表组件** (`web/src/components/experience/ExperienceList.tsx`)：
```tsx
// 修改前
<Link href={`/search/experience/${experience.id}`}>

// 修改后
<Link href={`/experience/${experience.id}`}>
```

### 步骤3：验证路由结构

确保最终只有一个正确的路由文件：
```
web/src/app/
  └── experience/
      └── [id]/
          └── page.tsx  // ✅ 唯一的详情页路由
```

### 步骤4：重新构建并测试

```bash
# 清理构建缓存
npm run build

# 启动开发服务器
npm run dev
```

## Context

**技术栈**：
- Next.js 15.5.6 (App Router)
- React
- TypeScript
- Node.js v22.13.0

**项目结构**：
- 使用 Next.js App Router 架构
- 采用路由组 (Route Groups) 组织路由
- 多个组件共享经验详情页链接

**相关文件**：
- `web/src/app/experience/[id]/page.tsx` - 经验详情页面
- `web/src/app/admin/user-dashboard/page.tsx` - 用户仪表盘
- `web/src/components/experience/ExperienceList.tsx` - 经验列表组件

## Lessons Learned

1. **路由组不改变URL路径**：Next.js 的路由组 `(groupName)` 仅用于组织文件，不影响实际URL路径。`(search)/experience/[id]` 和 `experience/[id]` 都会解析为 `/experience/[id]`。

2. **一个路径只能有一个页面**：Next.js 严格禁止多个页面路由解析到相同路径，这是为了避免路由歧义。

3. **链接路径要与路由结构匹配**：所有链接的 `href` 属性必须与实际的路由路径完全匹配。

4. **构建错误优先解决**：路由冲突会导致构建失败，必须在开发阶段解决，不能留到生产环境。

5. **全局搜索验证链接**：修改路由结构后，应该全局搜索所有相关链接，确保一致性。

## References

- [Next.js Route Groups 文档](https://nextjs.org/docs/app/building-your-application/routing/route-groups)
- [Next.js Dynamic Routes 文档](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes)
- [Next.js App Router 文档](https://nextjs.org/docs/app/building-your-application/routing)