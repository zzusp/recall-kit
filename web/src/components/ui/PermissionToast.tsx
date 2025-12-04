/**
 * 统一的权限提示Toast组件
 * 专门用于显示权限相关的提示信息
 */

'use client';

import { useEffect, useState } from 'react';
import { X, Shield, Lock, AlertTriangle } from 'lucide-react';

export interface PermissionToastProps {
  id: string;
  type: 'unauthorized' | 'forbidden';
  title: string;
  message: string;
  duration?: number;
  onClose?: (id: string) => void;
  persistent?: boolean;
}

const PermissionToast = ({ 
  id, 
  type, 
  title, 
  message, 
  duration = 5000, 
  onClose,
  persistent = false
}: PermissionToastProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // 进入动画
    const enterTimer = setTimeout(() => setIsVisible(true), 10);
    
    // 自动关闭（非持久化提示）
    let autoCloseTimer: NodeJS.Timeout;
    if (!persistent && duration > 0) {
      autoCloseTimer = setTimeout(() => {
        handleClose();
      }, duration);
    }

    return () => {
      clearTimeout(enterTimer);
      if (autoCloseTimer) clearTimeout(autoCloseTimer);
    };
  }, [duration, persistent]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose?.(id);
    }, 300);
  };

  const getIcon = () => {
    const iconClass = "w-6 h-6";
    switch (type) {
      case 'unauthorized':
        return <Lock className={`${iconClass} text-orange-500`} />;
      case 'forbidden':
        return <Shield className={`${iconClass} text-red-500`} />;
      default:
        return <AlertTriangle className={`${iconClass} text-yellow-500`} />;
    }
  };

  const getThemeStyles = () => {
    switch (type) {
      case 'unauthorized':
        return {
          background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)',
          borderColor: '#fb923c',
          iconBg: '#fff7ed',
          titleColor: '#c2410c',
          messageColor: '#9a3412',
        };
      case 'forbidden':
        return {
          background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
          borderColor: '#f87171',
          iconBg: '#fef2f2',
          titleColor: '#dc2626',
          messageColor: '#991b1b',
        };
      default:
        return {
          background: 'linear-gradient(135deg, #fefce8 0%, #fde047 100%)',
          borderColor: '#facc15',
          iconBg: '#fefce8',
          titleColor: '#ca8a04',
          messageColor: '#a16207',
        };
    }
  };

  const theme = getThemeStyles();

  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        padding: '1rem 1.25rem',
        borderRadius: '0.75rem',
        border: `2px solid ${theme.borderColor}`,
        background: theme.background,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        minWidth: '320px',
        maxWidth: '480px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isVisible && !isLeaving ? 'translateX(0) scale(1)' : 'translateX(100%) scale(0.95)',
        opacity: isVisible && !isLeaving ? 1 : 0,
      }}
    >
      {/* 图标容器 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '2.5rem',
          height: '2.5rem',
          borderRadius: '50%',
          backgroundColor: theme.iconBg,
          flexShrink: 0,
          marginTop: '0.125rem',
        }}
      >
        {getIcon()}
      </div>

      {/* 内容区域 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* 标题 */}
        <h3
          style={{
            margin: '0 0 0.25rem 0',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: theme.titleColor,
            lineHeight: '1.25rem',
          }}
        >
          {title}
        </h3>

        {/* 消息内容 */}
        <p
          style={{
            margin: 0,
            fontSize: '0.8125rem',
            fontWeight: '400',
            color: theme.messageColor,
            lineHeight: '1.375rem',
            wordBreak: 'break-word',
          }}
        >
          {message}
        </p>
      </div>

      {/* 关闭按钮 */}
      {!persistent && (
        <button
          onClick={handleClose}
          style={{
            padding: '0.25rem',
            borderRadius: '50%',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: theme.messageColor,
            transition: 'all 0.2s ease',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `${theme.borderColor}33`;
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default PermissionToast;
