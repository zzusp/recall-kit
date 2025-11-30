const isProd = process.env.NODE_ENV === 'production';

// BasePath 配置，从环境变量读取
// 如果没有配置，则不设置 basePath（按根路径处理）
// 注意：basePath 必须在构建时设置，如果未设置则按根路径处理
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(basePath && { basePath }),
  compress: isProd,
  output: 'standalone',
  experimental: {
    serverActions: {
      enabled: true,
    },
  },
  images: {
    domains: ['localhost'],
  },
  eslint: {
    // 在构建时忽略 ESLint 错误，避免因代码风格问题导致构建失败
    // 代码质量检查应该在开发阶段和 CI 中单独进行（如：npm run lint）
    // Docker 构建环境中 ESLint 可能更严格，因此需要此配置
    ignoreDuringBuilds: true,
  },
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
};

// 高阶函数包装器（为将来插件扩展准备）
const withConfig = (config) => config;

module.exports = withConfig(nextConfig);