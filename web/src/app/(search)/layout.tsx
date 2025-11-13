import '../globals.css'
import Header from '@/components/Header'

export const metadata = {
  title: 'Recall Kit - AI开发踩坑记录检索平台',
  description: '记录、分享、复用开发经验，让每一次踩坑都成为团队的智慧财富',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Open+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
        <Header />
        <main>{children}</main>
      </body>
    </html>
  )
}
