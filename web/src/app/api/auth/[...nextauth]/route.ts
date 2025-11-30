/**
 * NextAuth.js v5 Route Handlers
 * 
 * Next.js 15 要求 route.ts 文件只能导出路由处理器（GET, POST 等）
 * 因此我们将 NextAuth 配置移到了 @/lib/auth.ts，这里只导出路由处理器
 */
import { handlers } from '@/lib/auth';

// 导出路由处理器（Next.js 15 要求）
export const GET = handlers.GET;
export const POST = handlers.POST;

