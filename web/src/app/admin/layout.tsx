'use client';

import Sidebar from '@/components/admin/Sidebar';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAdmin } from '@/lib/services/authService';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    // Skip auth check for login page
    if (isLoginPage) {
      setIsLoading(false);
      return;
    }

    const verifyAdmin = async () => {
      const admin = await isAdmin();
      if (!admin) {
        router.push('/admin/login');
        return;
      }
      setIsLoading(false);
    };

    verifyAdmin();
  }, [router, isLoginPage]);

  if (isLoading) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
        </div>
        <p>加载中...</p>
      </div>
    );
  }

  // Login page doesn't need sidebar
  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="admin-layout">
      <Sidebar />
      <main className="admin-main">
        <div className="admin-content">
          {children}
        </div>
      </main>
    </div>
  );
}
