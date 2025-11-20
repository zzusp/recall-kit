import React, { useState, useEffect } from 'react';
import { errorHandler, ErrorInfo } from '../lib/utils/errorHandler';

interface ErrorMonitorProps {
  visible?: boolean;
  onErrorClick?: (error: ErrorInfo) => void;
}

export const ErrorMonitor: React.FC<ErrorMonitorProps> = ({ 
  visible = false, 
  onErrorClick 
}) => {
  const [errors, setErrors] = useState<ErrorInfo[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const updateErrors = () => {
      setErrors(errorHandler.getRecentErrors(10));
    };

    // 初始加载
    updateErrors();

    // 定期更新错误列表
    const interval = setInterval(updateErrors, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!visible || errors.length === 0) {
    return null;
  }

  const getErrorIcon = (type: ErrorInfo['type']) => {
    switch (type) {
      case 'network':
        return '🌐';
      case 'api':
        return '🔌';
      case 'runtime':
        return '⚠️';
      default:
        return '❓';
    }
  };

  const getErrorMessage = (error: ErrorInfo) => {
    if (error.message.includes('content_script')) {
      return '浏览器扩展错误 - 建议禁用扩展';
    }
    if (error.message.includes('fetchError')) {
      return '网络请求失败';
    }
    return error.message.substring(0, 50) + '...';
  };

  const clearErrors = () => {
    errorHandler.clear();
    setErrors([]);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-lg border border-gray-200 max-w-md">
      <div 
        className="flex items-center justify-between p-3 bg-red-50 border-b border-red-200 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <span className="text-red-600 font-semibold">
            ⚠️ 检测到 {errors.length} 个错误
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearErrors();
            }}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            清除
          </button>
          <span className="text-gray-400">{isExpanded ? '▼' : '▲'}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="max-h-64 overflow-y-auto">
          {errors.map((error, index) => (
            <div
              key={index}
              className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
              onClick={() => onErrorClick?.(error)}
            >
              <div className="flex items-start space-x-2">
                <span className="text-lg">{getErrorIcon(error.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {getErrorMessage(error)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(error.timestamp).toLocaleTimeString()}
                    <span className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">
                      {error.type}
                    </span>
                  </div>
                  {error.message.includes('content_script') && (
                    <div className="text-xs text-blue-600 mt-1">
                      💡 尝试禁用浏览器扩展后刷新页面
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 错误详情模态框组件
interface ErrorDetailModalProps {
  error: ErrorInfo | null;
  onClose: () => void;
}

export const ErrorDetailModal: React.FC<ErrorDetailModalProps> = ({ error, onClose }) => {
  if (!error) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1100]">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto m-4">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold">错误详情</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">错误类型</label>
            <p className="mt-1 text-sm text-gray-900">{error.type}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">错误消息</label>
            <p className="mt-1 text-sm text-gray-900 break-all">{error.message}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">时间戳</label>
            <p className="mt-1 text-sm text-gray-900">
              {new Date(error.timestamp).toLocaleString()}
            </p>
          </div>
          
          {error.userAgent && (
            <div>
              <label className="block text-sm font-medium text-gray-700">用户代理</label>
              <p className="mt-1 text-sm text-gray-900 break-all">{error.userAgent}</p>
            </div>
          )}
          
          {error.url && (
            <div>
              <label className="block text-sm font-medium text-gray-700">页面URL</label>
              <p className="mt-1 text-sm text-gray-900 break-all">{error.url}</p>
            </div>
          )}
          
          {error.stack && (
            <div>
              <label className="block text-sm font-medium text-gray-700">调用栈</label>
              <pre className="mt-1 text-xs text-gray-900 bg-gray-50 p-2 rounded overflow-x-auto">
                {error.stack}
              </pre>
            </div>
          )}
          
          {error.message.includes('content_script') && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <h4 className="text-sm font-medium text-blue-800 mb-2">🔧 解决建议</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>1. 打开浏览器扩展管理页面</li>
                <li>2. 暂时禁用所有扩展</li>
                <li>3. 刷新页面检查是否还有错误</li>
                <li>4. 逐个启用扩展以确定问题来源</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 错误监控 Hook
export const useErrorMonitor = () => {
  const [selectedError, setSelectedError] = useState<ErrorInfo | null>(null);

  const showErrors = () => {
    const errors = errorHandler.getRecentErrors();
    return errors.filter(error => 
      error.message.includes('content_script') || 
      error.message.includes('fetchError')
    );
  };

  return {
    errors: showErrors(),
    selectedError,
    setSelectedError,
    clearAll: () => errorHandler.clear(),
    getStats: () => errorHandler.getStats()
  };
};