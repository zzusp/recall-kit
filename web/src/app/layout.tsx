import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ToastContainer from '@/components/ui/ToastContainer'
import { Providers } from './providers'
import { auth } from '@/lib/auth'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Recall Kit - AI开发经验知识库检索平台',
  description: '记录、分享、复用开发经验，让每一次经验都成为团队的智慧财富',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 在服务端获取 session，避免客户端请求 /api/auth/session
  // 使用 try-catch 避免 NextAuth 内部错误（如 location is not defined）导致整个应用崩溃
  let session = null;
  try {
    session = await auth();
  } catch (error) {
    // 在生产环境中，如果 auth() 调用失败，记录错误但不阻止页面渲染
    // 这样即使 session 获取失败，用户仍然可以访问公开页面
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to get session in layout:', error);
    }
    // session 保持为 null，让客户端 SessionProvider 处理
  }

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Open+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Providers session={session}>
          {children}
        </Providers>
        <ToastContainer />
        <script dangerouslySetInnerHTML={{
          __html: `
            if (typeof window !== 'undefined') {
              // 修复 hydration mismatch：确保客户端 HTML 与服务端一致
              // 移除可能由浏览器扩展或其他脚本添加的 data-theme 属性
              if (document.documentElement.hasAttribute('data-theme')) {
                document.documentElement.removeAttribute('data-theme');
              }
              
              window.addEventListener('error', function(e) {
                if (e.message && e.message.includes('content_script')) {
                  console.warn('🔧 浏览器扩展错误已忽略，建议禁用扩展');
                  e.preventDefault();
                  return false;
                }
              });
              window.addEventListener('unhandledrejection', function(e) {
                if (e.reason && e.reason.message && e.reason.message.includes('content_script')) {
                  console.warn('🔧 浏览器扩展 Promise 错误已忽略');
                  e.preventDefault();
                  return false;
                }
              });
            }
          `
        }} />
      </body>
    </html>
  )
}