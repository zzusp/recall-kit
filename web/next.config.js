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
  // eslint: {
  //   ignoreDuringBuilds: true,
  // },
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
};

// 高阶函数包装器（为将来插件扩展准备）
const withConfig = (config) => config;

module.exports = withConfig(nextConfig);