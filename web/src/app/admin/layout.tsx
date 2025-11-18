'use client';

import Sidebar from '@/components/admin/Sidebar';
import PermissionGuard from '@/components/auth/PermissionGuard';
import { usePathname } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  // Login page doesn't need auth guard
  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <PermissionGuard>
      <div className="admin-layout">
        <Sidebar />
        <main className="admin-main">
          <div className="admin-content">
            {children}
          </div>
        </main>
      </div>
    </PermissionGuard>
  );
}
