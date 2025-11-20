'use client';

import { toast } from '@/lib/services/internal/toastService';

export default function TestToastPage() {
  const testToast = (type: 'success' | 'error' | 'warning' | 'info') => {
    const messages = {
      success: '这是一个成功提示！Toast 功能正常工作。',
      error: '这是一个错误提示！用于显示错误信息。',
      warning: '这是一个警告提示！请注意相关操作。',
      info: '这是一个信息提示！用于显示一般信息。'
    };
    
    toast[type](messages[type]);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem', fontSize: '2rem', fontWeight: 'bold' }}>
        Toast 功能测试
      </h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ marginBottom: '1rem', color: '#666' }}>
          点击下面的按钮测试不同类型的 Toast 提示：
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => testToast('success')}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            测试成功提示
          </button>
          
          <button
            onClick={() => testToast('error')}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            测试错误提示
          </button>
          
          <button
            onClick={() => testToast('warning')}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            测试警告提示
          </button>
          
          <button
            onClick={() => testToast('info')}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            测试信息提示
          </button>
        </div>
      </div>

      <div style={{ 
        padding: '1.5rem', 
        background: '#f8fafc', 
        borderRadius: '0.5rem',
        border: '1px solid #e2e8f0'
      }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>调试信息</h2>
        <p style={{ color: '#666', lineHeight: '1.6' }}>
          如果 Toast 没有显示，请检查：
        </p>
        <ul style={{ color: '#666', lineHeight: '1.8', paddingLeft: '1.5rem' }}>
          <li>浏览器控制台是否有错误信息</li>
          <li>ToastContainer 是否在根布局中正确引入</li>
          <li>Zustand store 是否正常工作</li>
          <li>Tailwind CSS 样式是否正确加载</li>
          <li>Lucide React 图标是否正确加载</li>
        </ul>
      </div>
    </div>
  );
}