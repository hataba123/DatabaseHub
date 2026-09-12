import React, { useState, useMemo } from 'react';
import { Input, Tree, Typography, Space, Badge } from 'antd';
import {
  SearchOutlined,
  DatabaseOutlined,
  TableOutlined,
  EyeOutlined,
  CodeOutlined,
  FolderOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { DatabaseObjectItem } from '@/types/table';

const { Text } = Typography;

interface DatabaseTreeExplorerProps {
  databaseId: string;
  databaseName: string;
  objects: DatabaseObjectItem[];
  currentTableName?: string;
}

export const DatabaseTreeExplorer: React.FC<DatabaseTreeExplorerProps> = ({
  databaseId,
  databaseName,
  objects,
  currentTableName,
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([
    `db-${databaseId}`,
    `folder-tables-${databaseId}`,
  ]);
  const navigate = useNavigate();

  // Separate objects
  const tables = useMemo(
    () => objects.filter((o) => o.type === 'table'),
    [objects]
  );
  const views = useMemo(
    () => objects.filter((o) => o.type === 'view'),
    [objects]
  );
  const procs = useMemo(
    () => objects.filter((o) => o.type === 'procedure'),
    [objects]
  );

  // Filter objects by search query
  const filterBySearch = (list: DatabaseObjectItem[]) => {
    if (!searchValue.trim()) return list;
    return list.filter((item) =>
      item.name.toLowerCase().includes(searchValue.toLowerCase())
    );
  };

  const filteredTables = filterBySearch(tables);
  const filteredViews = filterBySearch(views);
  const filteredProcs = filterBySearch(procs);

  // Tree data structure
  const treeData = [
    {
      title: (
        <Space size={6}>
          <Text strong style={{ fontSize: 13, color: '#0f172a' }}>
            {databaseName}
          </Text>
        </Space>
      ),
      key: `db-${databaseId}`,
      icon: <DatabaseOutlined style={{ color: '#1677ff' }} />,
      children: [
        {
          title: (
            <Space size={6}>
              <Text style={{ fontSize: 12, color: '#475569' }}>Tables</Text>
              <Badge
                count={tables.length}
                style={{ backgroundColor: '#f1f5f9', color: '#64748b', fontSize: 10 }}
              />
            </Space>
          ),
          key: `folder-tables-${databaseId}`,
          icon: ({ expanded }: { expanded: boolean }) =>
            expanded ? (
              <FolderOpenOutlined style={{ color: '#10b981' }} />
            ) : (
              <FolderOutlined style={{ color: '#10b981' }} />
            ),
          children: filteredTables.map((tbl) => ({
            title: (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: currentTableName === tbl.name ? 600 : 400,
                  color: currentTableName === tbl.name ? '#1677ff' : '#334155',
                }}
              >
                {tbl.name}
              </span>
            ),
            key: `table-${tbl.name}`,
            icon: <TableOutlined style={{ color: '#10b981', fontSize: 13 }} />,
            isLeaf: true,
            tableName: tbl.name,
          })),
        },
        {
          title: (
            <Space size={6}>
              <Text style={{ fontSize: 12, color: '#475569' }}>Views</Text>
              <Badge
                count={views.length}
                style={{ backgroundColor: '#f1f5f9', color: '#64748b', fontSize: 10 }}
              />
            </Space>
          ),
          key: `folder-views-${databaseId}`,
          icon: ({ expanded }: { expanded: boolean }) =>
            expanded ? (
              <FolderOpenOutlined style={{ color: '#8b5cf6' }} />
            ) : (
              <FolderOutlined style={{ color: '#8b5cf6' }} />
            ),
          children: filteredViews.map((vw) => ({
            title: <span style={{ fontSize: 12, color: '#334155' }}>{vw.name}</span>,
            key: `view-${vw.name}`,
            icon: <EyeOutlined style={{ color: '#8b5cf6', fontSize: 13 }} />,
            isLeaf: true,
            viewName: vw.name,
          })),
        },
        {
          title: (
            <Space size={6}>
              <Text style={{ fontSize: 12, color: '#475569' }}>Stored Procedures</Text>
              <Badge
                count={procs.length}
                style={{ backgroundColor: '#f1f5f9', color: '#64748b', fontSize: 10 }}
              />
            </Space>
          ),
          key: `folder-procs-${databaseId}`,
          icon: ({ expanded }: { expanded: boolean }) =>
            expanded ? (
              <FolderOpenOutlined style={{ color: '#f59e0b' }} />
            ) : (
              <FolderOutlined style={{ color: '#f59e0b' }} />
            ),
          children: filteredProcs.map((sp) => ({
            title: <span style={{ fontSize: 12, color: '#334155' }}>{sp.name}</span>,
            key: `sp-${sp.name}`,
            icon: <CodeOutlined style={{ color: '#f59e0b', fontSize: 13 }} />,
            isLeaf: true,
            procName: sp.name,
          })),
        },
      ],
    },
  ];

  const handleSelect = (_keys: React.Key[], info: any) => {
    const node = info.node;
    if (node.tableName) {
      navigate(`/databases/${databaseId}/tables/${node.tableName}`);
    } else if (node.key === `folder-tables-${databaseId}`) {
      navigate(`/databases/${databaseId}/tables`);
    } else if (node.key === `folder-views-${databaseId}` || node.viewName) {
      navigate(`/databases/${databaseId}/views`);
    } else if (node.key === `folder-procs-${databaseId}` || node.procName) {
      navigate(`/databases/${databaseId}/procedures`);
    } else if (node.key === `db-${databaseId}`) {
      navigate(`/databases/${databaseId}`);
    }
  };

  return (
    <div
      style={{
        width: 260,
        height: '100%',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        padding: '14px 12px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ marginBottom: 10 }}>
        <Text strong style={{ fontSize: 13, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' }}>
          Database Explorer
        </Text>
      </div>

      <Input
        size="small"
        placeholder="Filter objects..."
        prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        allowClear
        style={{ marginBottom: 12, borderRadius: 4 }}
      />

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Tree
          showIcon
          defaultExpandAll={false}
          expandedKeys={expandedKeys}
          onExpand={(keys) => setExpandedKeys(keys)}
          selectedKeys={currentTableName ? [`table-${currentTableName}`] : []}
          treeData={treeData}
          onSelect={handleSelect}
          style={{ background: 'transparent' }}
        />
      </div>
    </div>
  );
};
