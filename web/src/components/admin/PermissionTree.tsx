'use client';

import { useState, useEffect } from 'react';
import PermissionTreeNode, { PermissionTreeNode as PermissionTreeNodeType } from './PermissionTreeNode';

interface PermissionTreeProps {
  data: PermissionTreeNodeType[];
  onSelect?: (node: PermissionTreeNodeType) => void;
  onCheck?: (node: PermissionTreeNodeType, checked: boolean) => void;
  showCheckbox?: boolean;
  expandAll?: boolean;
  readonly?: boolean;
  selectedId?: string | null;
  searchTerm?: string;
}

export default function PermissionTree({
  data,
  onSelect,
  onCheck,
  showCheckbox = false,
  expandAll = false,
  readonly = false,
  selectedId,
  searchTerm = ''
}: PermissionTreeProps) {
  const [filteredData, setFilteredData] = useState<PermissionTreeNodeType[]>(data);

  // 过滤数据
  useEffect(() => {
    if (!searchTerm) {
      setFilteredData(data);
      return;
    }

    const filterNode = (node: PermissionTreeNodeType): PermissionTreeNodeType | null => {
      const matchesSearch =
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.page_path?.toLowerCase().includes(searchTerm.toLowerCase());

      const filteredChildren = node.children
        ?.map(filterNode)
        .filter((child): child is PermissionTreeNodeType => child !== null) || [];

      if (matchesSearch || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : node.children
        };
      }

      return null;
    };

    const filtered = data
      .map(filterNode)
      .filter((node): node is PermissionTreeNodeType => node !== null);

    setFilteredData(filtered);
  }, [data, searchTerm]);

  if (filteredData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {searchTerm ? '没有找到匹配的权限' : '暂无权限数据'}
      </div>
    );
  }

  return (
    <div className="permission-tree">
      {filteredData.map((node) => (
        <PermissionTreeNode
          key={node.id}
          node={node}
          onSelect={onSelect}
          onCheck={onCheck}
          showCheckbox={showCheckbox}
          readonly={readonly}
          selectedId={selectedId}
        />
      ))}
    </div>
  );
}

