import React, { useState, useEffect } from 'react';
import { Modal, Input, List, Tag, Typography, Empty } from 'antd';
import {
  SearchOutlined,
  DatabaseOutlined,
  TableOutlined,
  EyeOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';

const { Text } = Typography;

interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  type: 'DATABASE' | 'TABLE' | 'VIEW' | 'PROCEDURE';
  path: string;
}

const mockSearchItems: SearchResultItem[] = [
  { id: '1', title: 'PMSC Production', subtitle: 'DB-SRV-01 • SQL Server 2022', type: 'DATABASE', path: '/databases/pmsc' },
  { id: '2', title: 'HR Database', subtitle: 'DB-SRV-02 • SQL Server 2019', type: 'DATABASE', path: '/databases/hr' },
  { id: '3', title: 'Weigh Station', subtitle: 'DB-SRV-03 • SQL Server 2019', type: 'DATABASE', path: '/databases/weigh-station' },
  { id: '4', title: 'NhanVienDaiThanh', subtitle: 'PMSC Production • dbo.NhanVienDaiThanh (326,842 rows)', type: 'TABLE', path: '/databases/pmsc/tables/NhanVienDaiThanh' },
  { id: '5', title: 'HQ_Size', subtitle: 'PMSC Production • dbo.HQ_Size (82 rows)', type: 'TABLE', path: '/databases/pmsc/tables/HQ_Size' },
  { id: '6', title: 'HQ_PhieuCan', subtitle: 'PMSC Production • dbo.HQ_PhieuCan (82,420 rows)', type: 'TABLE', path: '/databases/pmsc/tables/HQ_PhieuCan' },
  { id: '7', title: 'Departments', subtitle: 'PMSC Production • dbo.Departments (45 rows)', type: 'TABLE', path: '/databases/pmsc/tables/Departments' },
  { id: '8', title: 'vw_EmployeeSummary', subtitle: 'PMSC Production • dbo.vw_EmployeeSummary', type: 'VIEW', path: '/databases/pmsc/views' },
  { id: '9', title: 'vw_DailyProductionReport', subtitle: 'PMSC Production • dbo.vw_DailyProductionReport', type: 'VIEW', path: '/databases/pmsc/views' },
  { id: '10', title: 'sp_CalculateMonthlyPayroll', subtitle: 'PMSC Production • dbo.sp_CalculateMonthlyPayroll', type: 'PROCEDURE', path: '/databases/pmsc/procedures' },
];

export const GlobalSearchModal: React.FC = () => {
  const { globalSearchOpen, setGlobalSearchOpen } = useAppStore();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  // Listen for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setGlobalSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setGlobalSearchOpen]);

  const filteredResults = query.trim()
    ? mockSearchItems.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.subtitle.toLowerCase().includes(query.toLowerCase())
      )
    : mockSearchItems;

  const handleSelect = (item: SearchResultItem) => {
    setGlobalSearchOpen(false);
    setQuery('');
    navigate(item.path);
  };

  const getTypeIcon = (type: SearchResultItem['type']) => {
    switch (type) {
      case 'DATABASE':
        return <DatabaseOutlined style={{ color: '#1677ff' }} />;
      case 'TABLE':
        return <TableOutlined style={{ color: '#10b981' }} />;
      case 'VIEW':
        return <EyeOutlined style={{ color: '#8b5cf6' }} />;
      case 'PROCEDURE':
        return <CodeOutlined style={{ color: '#f59e0b' }} />;
    }
  };

  const getTypeTag = (type: SearchResultItem['type']) => {
    switch (type) {
      case 'DATABASE':
        return <Tag color="blue">DATABASE</Tag>;
      case 'TABLE':
        return <Tag color="green">TABLE</Tag>;
      case 'VIEW':
        return <Tag color="purple">VIEW</Tag>;
      case 'PROCEDURE':
        return <Tag color="orange">PROCEDURE</Tag>;
    }
  };

  return (
    <Modal
      open={globalSearchOpen}
      onCancel={() => {
        setGlobalSearchOpen(false);
        setQuery('');
      }}
      footer={null}
      width={600}
      title={null}
      destroyOnClose
      styles={{ body: { padding: '16px 20px 20px 20px' } }}
      style={{ top: 80 }}
    >
      <Input
        prefix={<SearchOutlined style={{ color: '#94a3b8', fontSize: 16 }} />}
        placeholder="Search databases, tables, views, procedures... (Ctrl + K)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
        variant="filled"
        style={{
          height: 42,
          fontSize: 14,
          borderRadius: 6,
          marginBottom: 16,
        }}
      />

      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
        {filteredResults.length === 0 ? (
          <Empty description="No matching database objects found" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <List
            dataSource={filteredResults}
            renderItem={(item) => (
              <List.Item
                onClick={() => handleSelect(item)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  borderBottom: '1px solid #f1f5f9',
                  transition: 'background 0.15s ease',
                }}
                className="search-item-hover"
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#f8fafc')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 12 }}>
                  <div style={{ fontSize: 18, display: 'flex', alignItems: 'center' }}>
                    {getTypeIcon(item.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, color: '#0f172a', fontSize: 13 }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{item.subtitle}</div>
                  </div>
                  <div>{getTypeTag(item.type)}</div>
                </div>
              </List.Item>
            )}
          />
        )}
      </div>

      <div
        style={{
          marginTop: 16,
          paddingTop: 12,
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 12,
          color: '#94a3b8',
        }}
      >
        <span>
          Navigate with <Text keyboard>↑</Text> <Text keyboard>↓</Text> and <Text keyboard>Enter</Text>
        </span>
        <span>
          Close with <Text keyboard>Esc</Text>
        </span>
      </div>
    </Modal>
  );
};
