import '../globals.css'
import Header from '@/components/Header'

export const metadata = {
  title: 'Recall Kit - AI开发踩坑记录检索平台',
  description: '记录、分享、复用开发经验，让每一次踩坑都成为团队的智慧财富',
}

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      <Header />
      <main>{children}</main>
    </div>
  )
}
