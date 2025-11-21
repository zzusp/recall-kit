const isProd = process.env.NODE_ENV === 'production';

/** @type {import('next').NextConfig} */
const nextConfig = {
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