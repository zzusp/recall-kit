'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: 'danger' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog = ({ 
  isOpen, 
  title, 
  message, 
  type = 'danger',
  confirmText = '确认',
  cancelText = '取消',
  onConfirm, 
  onCancel 
}: ConfirmDialogProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
      case 'warning':
        return <AlertTriangle size={24} className="text-red-500" />;
      case 'info':
        return <Info size={24} className="text-blue-500" />;
      default:
        return <AlertTriangle size={24} className="text-yellow-500" />;
    }
  };

  const getConfirmButtonStyle = () => {
    switch (type) {
      case 'danger':
        return {
          backgroundColor: '#dc2626',
          borderColor: '#dc2626'
        };
      case 'warning':
        return {
          backgroundColor: '#f59e0b',
          borderColor: '#f59e0b'
        };
      default:
        return {
          backgroundColor: '#3b82f6',
          borderColor: '#3b82f6'
        };
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.2s ease'
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          maxWidth: '448px',
          width: '90%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          transform: isVisible ? 'scale(1)' : 'scale(0.95)',
          transition: 'transform 0.2s ease'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
          {getIcon()}
          <div style={{ flex: 1 }}>
            <h3 style={{ 
              margin: '0 0 0.5rem 0', 
              fontSize: '1.125rem', 
              fontWeight: '600',
              color: '#1f2937'
            }}>
              {title}
            </h3>
            <p style={{ 
              margin: 0, 
              fontSize: '0.875rem', 
              color: '#6b7280',
              lineHeight: 1.5
            }}>
              {message}
            </p>
          </div>
          <button
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              padding: '0.25rem',
              cursor: 'pointer',
              color: '#6b7280',
              borderRadius: '0.25rem'
            }}
          >
            <X size={16} />
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'white',
              color: '#6b7280',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f9fafb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            {cancelText}
          </button>
          
          <button
            onClick={onConfirm}
            style={{
              padding: '0.5rem 1rem',
              ...getConfirmButtonStyle(),
              color: 'white',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              const style = getConfirmButtonStyle();
              e.currentTarget.style.filter = 'brightness(0.9)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'brightness(1)';
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// 创建一个简单的 hook 来管理确认对话框
export const useConfirmDialog = () => {
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'danger' | 'warning' | 'info';
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'danger'
  });

  const confirm = ({
    title,
    message,
    type = 'danger',
    confirmText = '确认',
    cancelText = '取消'
  }: {
    title: string;
    message: string;
    type?: 'danger' | 'warning' | 'info';
    confirmText?: string;
    cancelText?: string;
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogConfig({
        isOpen: true,
        title,
        message,
        type,
        confirmText,
        cancelText,
        onConfirm: () => {
          setDialogConfig(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        }
      });
    });
  };

  const handleCancel = () => {
    setDialogConfig(prev => ({ ...prev, isOpen: false }));
    if (dialogConfig.onConfirm) {
      dialogConfig.onConfirm = undefined;
    }
  };

  const ConfirmDialogComponent = () => (
    <ConfirmDialog
      isOpen={dialogConfig.isOpen}
      title={dialogConfig.title}
      message={dialogConfig.message}
      type={dialogConfig.type}
      confirmText={dialogConfig.confirmText}
      cancelText={dialogConfig.cancelText}
      onConfirm={() => {
        if (dialogConfig.onConfirm) {
          dialogConfig.onConfirm();
        }
      }}
      onCancel={handleCancel}
    />
  );

  return { confirm, ConfirmDialogComponent };
};

export default ConfirmDialog;