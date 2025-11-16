---
title: "Next.js App Router 嵌套 Layout 导致 React Hydration 错误"
generated_at: 2025-11-16T10:05:56Z
keywords:
  - Next.js
  - React
  - hydration
  - SSR
  - App Router
  - TypeScript
---

## Problem Description
在 Next.js App Router 项目中，打开 web 端首页时出现 React hydration 错误。错误信息显示服务器渲染的 HTML 与客户端不匹配，具体表现为：
- `lang` 属性不一致：服务器渲染为 "en"，客户端为 "zh-CN"
- Font Awesome 样式链接在客户端存在但服务器端缺失
- 控制台警告显示有多个 `<html>` 和 `<body>` 组件被同时挂载

错误堆栈指向 `(search)/layout.tsx:15` 和 `(search)/layout.tsx:20`，提示不应该同时渲染多个 `<html>` 和 `<body>` 组件。

## Root Cause
在 Next.js 13+ App Router 中，只有根 layout (`app/layout.tsx`) 可以包含 `<html>` 和 `<body>` 标签。嵌套的 layout 文件（如 `app/(search)/layout.tsx`）不应该包含这些标签。

问题根源：
1. 嵌套 layout 错误地包含了 `<html lang="zh-CN">` 和 `<body>` 标签
2. 根 layout 使用 `lang="en"`，而嵌套 layout 使用 `lang="zh-CN"`，导致服务器和客户端渲染不一致
3. 外部样式表链接（Font Awesome、Google Fonts）只在嵌套 layout 中，导致服务器端 HTML 缺少这些链接

## Solution
1. **修复根 layout** (`web/src/app/layout.tsx`)：
   - 将 `lang` 属性从 "en" 改为 "zh-CN"
   - 将 Font Awesome 和 Google Fonts 的链接移到根 layout 的 `<head>` 中
   - 更新 metadata 为中文内容

2. **修复嵌套 layout** (`web/src/app/(search)/layout.tsx`)：
   - 移除 `<html>` 和 `<body>` 标签
   - 使用 `<div>` 包装内容，保留原有的样式类名
   - 将函数名从 `RootLayout` 改为 `SearchLayout`（更准确的命名）

修复后的代码结构：
- 根 layout：包含 `<html>`、`<head>`、`<body>` 和所有全局资源
- 嵌套 layout：只包含页面特定的内容结构（Header、main 等）

## Context
- **技术栈**：Next.js 13+ App Router, React, TypeScript
- **项目结构**：使用路由组 `(search)` 组织相关页面
- **问题场景**：开发环境下的 SSR hydration 不匹配
- **相关文件**：
  - `web/src/app/layout.tsx` - 根 layout
  - `web/src/app/(search)/layout.tsx` - 嵌套 layout

## Lessons Learned
1. **Next.js App Router Layout 规则**：
   - 只有根 layout 可以包含 `<html>` 和 `<body>` 标签
   - 嵌套 layout 应该只包含页面内容结构，不能包含文档结构标签
   - 所有全局资源（外部样式表、字体等）应该在根 layout 中定义

2. **Hydration 错误排查**：
   - 检查是否有多个 layout 同时渲染 `<html>`/`<body>`
   - 确保服务器和客户端渲染的 HTML 结构完全一致
   - 注意 `lang` 属性、外部资源链接等可能造成不一致的地方

3. **最佳实践**：
   - 使用语义化的函数名（如 `SearchLayout` 而非 `RootLayout`）
   - 将全局配置集中在根 layout
   - 嵌套 layout 专注于页面布局和组件组织

## References
- [Next.js Layouts Documentation](https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts)
- [React Hydration Mismatch](https://react.dev/link/hydration-mismatch)
- 修复后的代码：
  - `web/src/app/layout.tsx` - 根 layout（包含 html/body）
  - `web/src/app/(search)/layout.tsx` - 嵌套 layout（仅内容结构）

