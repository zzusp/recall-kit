import '../globals.css'
import Header from '@/components/Header'

export const metadata = {
  title: 'Recall Kit - AI开发经验知识库检索平台',
  description: '记录、分享、复用开发经验，让每一次经验都成为团队的智慧财富',
}

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      <Header />
      <main className="pt-16">{children}</main>
    </div>
  )
}
