import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ToastContainer from '@/components/ui/ToastContainer'
import { Providers } from './providers'
import { auth } from '@/app/api/auth/[...nextauth]/route'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Recall Kit - AI开发踩坑记录检索平台',
  description: '记录、分享、复用开发经验，让每一次踩坑都成为团队的智慧财富',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 在服务端获取 session，避免客户端请求 /api/auth/session
  const session = await auth()

  return (
    <html lang="zh-CN">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Open+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className={inter.className}>
        <Providers session={session}>
          {children}
        </Providers>
        <ToastContainer />
        <script dangerouslySetInnerHTML={{
          __html: `
            if (typeof window !== 'undefined') {
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