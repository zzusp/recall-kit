'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single<{ role: string }>();

      if (profile?.role !== 'admin') {
        await supabase.auth.signOut();
        throw new Error('Access denied. Admin privileges required.');
      }

      router.push('/admin/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-title">
          <div className="login-icon">
            <i className="fas fa-user-lock"></i>
          </div>
          <span>管理员登录</span>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        <div className="form-group">
          <label className="form-label">用户名/邮箱</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
            placeholder="输入您的用户名或邮箱"
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">密码</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
            placeholder="输入您的密码"
          />
        </div>
        
        <div className="flex justify-between items-center my-6">
          <div className="flex items-center">
            <input type="checkbox" id="remember" className="mr-2" />
            <label htmlFor="remember">记住我</label>
          </div>
          <Link href="#" className="text-blue-600 font-semibold">忘记密码？</Link>
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="btn btn-primary w-full text-lg py-3"
        >
          {isLoading ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i> 登录中...
            </>
          ) : (
            <>
              <i className="fas fa-sign-in-alt mr-2"></i> 登录
            </>
          )}
        </button>
        
        <div className="text-center mt-6 text-gray-600">
          还没有账号？ <Link href="#" className="text-blue-600 font-semibold">立即注册</Link>
        </div>
      </div>
    </div>
  );
}