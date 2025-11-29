'use client';

import { useState } from 'react';
import { Permission } from '@/types/database/auth';

export interface PermissionTreeNode extends Permission {
  children?: PermissionTreeNode[];
  checked?: boolean;
  indeterminate?: boolean;
}

interface PermissionTreeNodeProps {
  node: PermissionTreeNode;
  level?: number;
  onSelect?: (node: PermissionTreeNode) => void;
  onCheck?: (node: PermissionTreeNode, checked: boolean) => void;
  showCheckbox?: boolean;
  readonly?: boolean;
  selectedId?: string | null;
}

export default function PermissionTreeNode({
  node,
  level = 0,
  onSelect,
  onCheck,
  showCheckbox = false,
  readonly = false,
  selectedId
}: PermissionTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2); // 默认展开前两级

  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;

  // 获取权限类型图标
  const getTypeIcon = () => {
    switch (node.type) {
      case 'module':
        return 'fas fa-folder';
      case 'page':
        return 'fas fa-file-alt';
      case 'function':
        return 'fas fa-key';
      default:
        return 'fas fa-circle';
    }
  };

  // 获取权限类型颜色
  const getTypeColor = () => {
    switch (node.type) {
      case 'module':
        return 'text-blue-500';
      case 'page':
        return 'text-green-500';
      case 'function':
        return 'text-purple-500';
      default:
        return 'text-gray-500';
    }
  };

  const handleToggle = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleSelect = () => {
    if (onSelect && !readonly) {
      onSelect(node);
    }
  };

  const handleCheck = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation(); // 阻止事件冒泡
    if (onCheck && !readonly) {
      onCheck(node, e.target.checked);
    }
  };

  return (
    <div className="permission-tree-node">
      <div
        className={`flex items-center py-2 px-3 hover:bg-gray-50 rounded cursor-pointer ${
          isSelected ? 'bg-blue-50 border-l-2 border-blue-500' : ''
        }`}
        style={{ paddingLeft: `${level * 24 + 12}px` }}
      >
        {/* 展开/折叠按钮 */}
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="mr-2 w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded"
          >
            <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'} text-xs text-gray-500`}></i>
          </button>
        ) : (
          <span className="mr-2 w-6"></span>
        )}

        {/* 复选框（如果启用） */}
        {showCheckbox && (
          <div onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={node.checked || false}
              onChange={handleCheck}
              onClick={(e) => e.stopPropagation()}
              className="mr-2 w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
              ref={(input) => {
                if (input) {
                  input.indeterminate = node.indeterminate || false;
                }
              }}
            />
          </div>
        )}

        {/* 类型图标 */}
        <i className={`${getTypeIcon()} ${getTypeColor()} mr-2`}></i>

        {/* 节点信息 */}
        <div className="flex-1" onClick={handleSelect}>
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium text-gray-900">{node.name}</span>
              {node.code && (
                <span className="ml-2 text-xs text-gray-500">({node.code})</span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {node.page_path && (
                <span className="text-xs text-gray-400">{node.page_path}</span>
              )}
              {node.type === 'function' && node.is_active === false && (
                <span className="text-xs text-red-500">已禁用</span>
              )}
            </div>
          </div>
          {node.description && (
            <div className="text-sm text-gray-500 mt-1">{node.description}</div>
          )}
        </div>
      </div>

      {/* 子节点 */}
      {hasChildren && isExpanded && (
        <div className="permission-tree-children">
          {node.children!.map((child) => (
            <PermissionTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              onCheck={onCheck}
              showCheckbox={showCheckbox}
              readonly={readonly}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

