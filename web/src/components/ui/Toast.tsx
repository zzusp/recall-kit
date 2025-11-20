'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export interface ToastProps {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose?: (id: string) => void;
}

const Toast = ({ id, message, type = 'info', duration = 3000, onClose }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // 进入动画
    setTimeout(() => setIsVisible(true), 10);

    // 自动关闭
    const timer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose?.(id);
    }, 300);
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBgStyle = () => {
    switch (type) {
      case 'success':
        return { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', border: '1px solid' };
      case 'error':
        return { backgroundColor: '#fef2f2', borderColor: '#fecaca', border: '1px solid' };
      case 'warning':
        return { backgroundColor: '#fffbeb', borderColor: '#fed7aa', border: '1px solid' };
      default:
        return { backgroundColor: '#eff6ff', borderColor: '#dbeafe', border: '1px solid' };
    }
  };

  const getTextStyle = () => {
    switch (type) {
      case 'success':
        return { color: '#166534' };
      case 'error':
        return { color: '#991b1b' };
      case 'warning':
        return { color: '#92400e' };
      default:
        return { color: '#1e40af' };
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '1rem',
        borderRadius: '0.5rem',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        minWidth: '300px',
        maxWidth: '448px',
        transition: 'all 0.3s ease-in-out',
        ...getBgStyle(),
        transform: isVisible && !isLeaving ? 'translateX(0)' : 'translateX(100%)',
        opacity: isVisible && !isLeaving ? 1 : 0
      }}
    >
      {getIcon()}
      <p style={{ 
        flex: 1, 
        fontSize: '0.875rem', 
        fontWeight: '500',
        margin: 0,
        ...getTextStyle()
      }}>
        {message}
      </p>
      <button
        onClick={handleClose}
        style={{
          padding: '0.25rem',
          borderRadius: '50%',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          transition: 'background-color 0.2s',
          ...getTextStyle()
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;