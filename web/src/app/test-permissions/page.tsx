/**
 * 权限提示测试页面
 * 用于验证统一权限提示的效果
 */

'use client';

import { useState } from 'react';
import { permissionToast } from '@/lib/client/services/permissionToast';
import PermissionGuard from '@/components/auth/PermissionGuard';

export default function TestPermissionsPage() {
  const [isLoading, setIsLoading] = useState(false);

  const testUnauthorized = () => {
    permissionToast.unauthorized();
  };

  const testForbidden = () => {
    permissionToast.forbidden();
  };

  const testNeedPermission = () => {
    permissionToast.needPermission('users.view');
  };

  const testNeedAdmin = () => {
    permissionToast.needAdmin();
  };

  const testSessionExpired = () => {
    permissionToast.sessionExpired();
  };

  const testCustomMessage = () => {
    permissionToast.forbidden({
      customMessage: '这是自定义的权限不足提示消息',
      duration: 3000,
    });
  };

  const testPersistentToast = () => {
    permissionToast.needSuperuser({
      persistent: true,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            权限提示测试页面
          </h1>
          
          <p className="text-gray-600 mb-8">
            点击下面的按钮测试不同类型的权限提示效果
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <button
              onClick={testUnauthorized}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
            >
              测试未授权提示
            </button>

            <button
              onClick={testForbidden}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              测试权限不足
            </button>

            <button
              onClick={testNeedPermission}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              测试需要特定权限
            </button>

            <button
              onClick={testNeedAdmin}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
            >
              测试需要管理员
            </button>

            <button
              onClick={testSessionExpired}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
            >
              测试登录过期
            </button>

            <button
              onClick={testCustomMessage}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              测试自定义消息
            </button>

            <button
              onClick={testPersistentToast}
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors"
            >
              测试持久化提示
            </button>
          </div>

          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              权限守卫测试
            </h2>
            <p className="text-gray-600 mb-4">
              下面是使用 PermissionGuard 组件的测试示例：
            </p>

            <div className="space-y-4">
              {/* 测试需要权限的内容 */}
              <PermissionGuard 
                code="users.view"
                fallback={
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                    ⚠️ 您没有查看用户列表的权限
                  </div>
                }
              >
                <div className="p-4 bg-green-50 border border-green-200 rounded text-green-800">
                  ✅ 您有权限查看用户列表（这段内容需要 users.view 权限）
                </div>
              </PermissionGuard>

              {/* 测试需要管理员权限的内容 */}
              <PermissionGuard
                fallback={
                  <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800">
                    ❌ 您没有管理员权限
                  </div>
                }
              >
                <div className="p-4 bg-green-50 border border-green-200 rounded text-green-800">
                  ✅ 您有管理员权限（这段内容需要管理员权限）
                </div>
              </PermissionGuard>

              {/* 测试需要特定页面的权限 */}
              <PermissionGuard
                pagePath="/admin/settings"
                fallback={
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded text-orange-800">
                    ⚠️ 您无法访问系统设置页面
                  </div>
                }
              >
                <div className="p-4 bg-green-50 border border-green-200 rounded text-green-800">
                  ✅ 您可以访问系统设置页面（这段内容需要页面权限）
                </div>
              </PermissionGuard>
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded">
            <h3 className="font-semibold text-blue-800 mb-2">使用说明：</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 权限提示会显示在页面右上角，具有独特的视觉样式</li>
              <li>• 未授权提示使用橙色主题，权限不足使用红色主题</li>
              <li>• 权限提示会显示在普通Toast上方，避免被遮挡</li>
              <li>• 可以自定义提示消息和显示时长</li>
              <li>• 支持持久化提示，需要用户手动关闭</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
