// 路径配置
// 与 next.config.js 中的 basePath 保持一致
// 从环境变量读取，如果没有配置则返回空字符串（按根路径处理）

// Next.js 会在构建时将 NEXT_PUBLIC_ 开头的环境变量内联到客户端代码中
// 根据 Next.js 官方文档，这是获取 basePath 的推荐方式
// 如果环境变量未设置，返回空字符串（按根路径处理）
const getBasePath = (): string => {
  // 从环境变量读取（构建时内联，官方推荐方式）
  // 根据 Next.js 官方文档，process.env.NEXT_PUBLIC_BASE_PATH 在构建时就已经内联
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BASE_PATH) {
    return process.env.NEXT_PUBLIC_BASE_PATH;
  }
  
  // 如果没有配置，返回空字符串（按根路径处理）
  return '';
};

// 使用函数而不是常量，确保每次都能获取最新的 basePath
// 在客户端，window.__NEXT_DATA__ 在页面加载时就已经存在，所以可以直接使用
// 在服务端，使用环境变量或默认值
export function getBasePathValue(): string {
  // 每次都重新获取，确保获取最新的值
  // 在客户端，window.__NEXT_DATA__ 在页面加载时就已经存在
  return getBasePath();
}

// 导出常量（向后兼容）
// 注意：在客户端，这个值会在模块加载时计算，此时 window.__NEXT_DATA__ 应该已经存在
// 如果不存在，会使用环境变量或默认值
// 但为了确保在页面刷新时也能正确获取，建议使用 getBasePathValue() 函数
export const BASE_PATH = getBasePathValue();

/**
 * 获取带 basePath 的完整路径
 * @param path 相对路径，如 '/admin/login'
 * @returns 完整路径，如果有 basePath 则如 '/web/admin/login'，否则如 '/admin/login'
 */
export function getFullPath(path: string): string {
  const basePath = getBasePathValue();
  // 如果没有 basePath，直接返回路径
  if (!basePath) {
    return path.startsWith('/') ? path : `/${path}`;
  }
  // 如果路径已经包含 basePath，直接返回
  if (path.startsWith(basePath)) {
    return path;
  }
  // 确保路径以 / 开头
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${basePath}${normalizedPath}`;
}

/**
 * 获取相对路径（去除 basePath）
 * @param fullPath 完整路径，如 '/web/admin/login'
 * @returns 相对路径，如 '/admin/login'
 */
export function getRelativePath(fullPath: string): string {
  if (fullPath.startsWith(BASE_PATH)) {
    return fullPath.slice(BASE_PATH.length) || '/';
  }
  return fullPath;
}

/**
 * 获取完整的 API URL（自动添加 basePath）
 * 用于客户端 fetch 调用，确保 API 请求包含 basePath
 * @param url 相对路径，如 '/api/auth/session'
 * @returns 完整路径，如果有 basePath 则如 '/web/api/auth/session'，否则如 '/api/auth/session'
 */
export function getApiUrl(url: string): string {
  // 如果已经是完整 URL（包含 http:// 或 https://），直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // 使用 getBasePathValue() 确保每次都获取最新的 basePath
  const basePath = getBasePathValue();
  
  // 如果没有 basePath，直接返回路径
  if (!basePath) {
    return url.startsWith('/') ? url : `/${url}`;
  }
  
  // 如果已经包含 basePath，直接返回
  if (url.startsWith(basePath)) {
    return url;
  }
  // 确保路径以 / 开头
  const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
  return `${basePath}${normalizedUrl}`;
}

