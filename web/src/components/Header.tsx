'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <header className="bg-white shadow-sm w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <i className="fas fa-brain text-2xl text-blue-600 mr-2"></i>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                Recall Kit
              </span>
            </div>
            <nav className="hidden md:ml-6 md:flex md:space-x-8">
              <Link 
                href="/" 
                className={`${isActive('/') ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500'} hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                首页
              </Link>
              <Link 
                href="/search" 
                className={`${isActive('/search') ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500'} hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                搜索
              </Link>
              {/* 知识库功能已隐藏 */}
              {/* <Link 
                href="/list" 
                className={`${isActive('/list') ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500'} hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                知识库
              </Link> */}
            </nav>
          </div>
          <div className="hidden md:ml-4 md:flex md:items-center">
            <Link href="/admin/login" className="ml-8 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
              管理员登录
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}