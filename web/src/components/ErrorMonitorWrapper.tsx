'use client';

import React, { useState, useEffect } from 'react';
import { ErrorMonitor, ErrorDetailModal, useErrorMonitor } from './ErrorMonitor';
import { errorHandler, ErrorInfo } from '../lib/utils/errorHandler';

const ErrorMonitorWrapper: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedError, setSelectedError] = useState<ErrorInfo | null>(null);
  const { errors, clearAll } = useErrorMonitor();

  useEffect(() => {
    // 只在开发环境或检测到浏览器扩展错误时显示
    const checkForExtensionErrors = () => {
      const hasExtensionErrors = errors.some(error => 
        error.message.includes('content_script') || 
        error.message.includes('fetchError')
      );
      
      const isDev = process.env.NODE_ENV === 'development';
      
      setIsVisible(hasExtensionErrors || isDev);
    };

    checkForExtensionErrors();

    // 定期检查
    const interval = setInterval(checkForExtensionErrors, 5000);

    return () => clearInterval(interval);
  }, [errors]);

  const handleErrorClick = (error: ErrorInfo) => {
    setSelectedError(error);
  };

  const closeModal = () => {
    setSelectedError(null);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <ErrorMonitor 
        visible={true}
        onErrorClick={handleErrorClick}
      />
      <ErrorDetailModal 
        error={selectedError}
        onClose={closeModal}
      />
    </>
  );
};

export default ErrorMonitorWrapper;