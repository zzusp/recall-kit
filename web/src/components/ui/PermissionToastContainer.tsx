/**
 * 权限提示Toast容器
 * 专门处理权限相关的Toast显示
 */

'use client';

import React from 'react';
import { useToastStore } from '@/lib/client/services/toast';
import PermissionToast from './PermissionToast';

/**
 * 检查是否为权限相关的Toast
 */
function isPermissionToast(toast: any): boolean {
  return toast.id && (toast.id as string).startsWith('permission-');
}

/**
 * 获取权限提示类型
 */
function getPermissionType(toast: any): 'unauthorized' | 'forbidden' {
  const message = toast.message || '';
  const title = toast.title || '';
  
  // 根据标题和消息内容判断类型
  if (title.includes('需要登录') || message.includes('登录') || message.includes('未授权')) {
    return 'unauthorized';
  }
  
  if (title.includes('权限不足') || message.includes('权限')) {
    return 'forbidden';
  }
  
  // 默认为权限不足
  return 'forbidden';
}

const PermissionToastContainer = () => {
  const { toasts, removeToast } = useToastStore();

  // 过滤出权限相关的Toast
  const permissionToasts = toasts.filter(isPermissionToast);

  // 非权限相关的Toast数量，用于调整位置
  const otherToastsCount = toasts.length - permissionToasts.length;

  return (
    <div
      style={{
        position: 'fixed',
        top: `${1 + otherToastsCount * 4.5}rem`, // 根据其他Toast数量调整位置
        right: '1rem',
        zIndex: 9998, // 比普通Toast低一点，避免遮挡
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        pointerEvents: 'none',
      }}
    >
      {permissionToasts.map((toast) => (
        <div key={toast.id} style={{ pointerEvents: 'auto' }}>
          <PermissionToast
            id={toast.id}
            type={getPermissionType(toast)}
            title={toast.title || '提示'}
            message={toast.message}
            duration={toast.duration}
            persistent={toast.persistent}
            onClose={removeToast}
          />
        </div>
      ))}
    </div>
  );
};

export default PermissionToastContainer;
