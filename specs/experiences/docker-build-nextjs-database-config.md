---
title: "Next.js 构建时数据库配置导致 Docker 构建失败"
generated_at: 2025-11-24T16:13:46Z
keywords:
    - Docker
    - Next.js
    - 数据库配置
    - 构建优化
---

## Problem Description
Next.js应用在本地命令行打包没有问题，但在Docker构建过程中，Next.js应用的构建阶段失败，错误信息显示数据库URL环境变量未设置。这导致整个Docker镜像构建过程中断。

## Root Cause
Next.js在构建时会预渲染页面和API路由，这个过程中会执行数据库连接检查。由于Dockerfile中没有正确设置DATABASE_URL环境变量，导致构建失败。同时，文件复制路径的错误也影响了构建过程。

## Solution
1. 在Dockerfile的构建阶段添加正确的DATABASE_URL环境变量。
2. 修正Dockerfile中的文件复制路径，确保Next.js应用文件被正确复制到容器中。
3. 优化Dockerfile结构，分离依赖安装和构建步骤，提高构建效率。
4. 创建一个启动脚本来管理多个服务的启动，避免端口冲突。

## Context
项目使用Next.js框架开发Web应用，并使用Docker进行容器化部署。应用包含前端（Next.js）和后端（MCP服务器）两个部分。在开发过程中，需要确保Docker构建过程能够正确处理Next.js的预渲染和API路由，同时管理多个服务的启动。

## Lessons Learned (Will not be submitted)
1. 在Docker构建过程中，需要考虑框架（如Next.js）的特殊构建要求，包括环境变量设置和文件路径配置。
2. 多阶段构建可以优化Docker镜像大小和构建效率。
3. 当容器内需要运行多个服务时，使用启动脚本可以更好地管理服务启动顺序和错误处理。
4. 在开发过程中，定期检查和更新Dockerfile可以避免累积复杂的构建问题。

## References (Will not be submitted)
- Next.js 官方文档：https://nextjs.org/docs/deployment#docker-image
- Docker 多阶段构建：https://docs.docker.com/build/building/multi-stage/
- Node.js Dockerization 最佳实践：https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md