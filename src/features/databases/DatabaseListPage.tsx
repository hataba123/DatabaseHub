import React, { useState, useEffect, useMemo } from 'react';
import {
  Row,
  Col,
  Card,
  Button,
  Input,
  Select,
  Radio,
  Space,
  Tag,
  Typography,
  Dropdown,
  Modal,
  message,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  AppstoreOutlined,
  BarsOutlined,
  DatabaseOutlined,
  MoreOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { AddConnectionModal } from '@/components/database/AddConnectionModal';
import { databaseService } from '@/services/databaseService';
import { DatabaseConnection } from '@/types/database';
import { formatTimeAgo } from '@/utils/formatters';
import { useTranslation } from '@/locales';

const { Text } = Typography;

export const DatabaseListPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const [databases, setDatabases] = useState<DatabaseConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [envFilter, setEnvFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('name');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const fetchDatabases = async () => {
    setLoading(true);
    const res = await databaseService.getDatabases();
    setDatabases(res);
    setLoading(false);
  };

  useEffect(() => {
    fetchDatabases();
  }, []);

  const handleTestConnection = async (db: DatabaseConnection) => {
    setTestingId(db.id);
    const res = await databaseService.testConnection(db);
    setTestingId(null);
    if (res.success) {
      message.success(
        language === 'vi'
          ? `Kết nối tới "${db.name}" thành công! Độ trễ: ${res.latencyMs}ms`
          : `Connection to "${db.name}" verified! Latency: ${res.latencyMs}ms`
      );
    } else {
      message.error(`Failed to connect to ${db.name}`);
    }
  };

  const handleDelete = (db: DatabaseConnection) => {
    Modal.confirm({
      title: language === 'vi' ? `Xóa kết nối "${db.name}"?` : `Delete connection "${db.name}"?`,
      content:
        language === 'vi'
          ? `Bạn có chắc chắn muốn xóa kết nối tới máy chủ ${db.serverHost}? Mọi thông tin cấu hình sẽ bị gỡ bỏ.`
          : `Are you sure you want to remove connection to ${db.serverHost}? All saved credentials will be purged.`,
      okType: 'danger',
      okText: language === 'vi' ? 'Xác nhận xóa' : 'Delete Connection',
      cancelText: t.common.cancel,
      onOk: async () => {
        await databaseService.deleteConnection(db.id);
        message.success(language === 'vi' ? `Đã xóa kết nối "${db.name}".` : `Connection "${db.name}" deleted.`);
        fetchDatabases();
      },
    });
  };

  // Filter and sort
  const filteredDatabases = useMemo(() => {
    return databases
      .filter((db) => {
        const matchesSearch =
          db.name.toLowerCase().includes(search.toLowerCase()) ||
          db.databaseName.toLowerCase().includes(search.toLowerCase()) ||
          db.serverHost.toLowerCase().includes(search.toLowerCase());

        const matchesStatus =
          statusFilter === 'All' || db.status === statusFilter;

        const matchesEnv =
          envFilter === 'All' || db.environment === envFilter;

        return matchesSearch && matchesStatus && matchesEnv;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'size') return b.sizeGb - a.sizeGb;
        if (sortBy === 'tables') return b.tablesCount - a.tablesCount;
        if (sortBy === 'connections') return b.activeConnections - a.activeConnections;
        return 0;
      });
  }, [databases, search, statusFilter, envFilter, sortBy]);

  return (
    <div>
      <PageHeader
        title={t.database.title}
        subtitle={t.database.subtitle}
        breadcrumbs={[{ title: t.nav.dashboard, path: '/dashboard' }, { title: t.database.title }]}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setAddModalOpen(true)}
          >
            {t.database.addBtn}
          </Button>
        }
      />

      {/* Filter and Control Bar */}
      <Card
        style={{ marginBottom: 20, borderRadius: 8, border: '1px solid #e2e8f0' }}
        styles={{ body: { padding: '12px 16px' } }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          {/* Left: Search & Filters */}
          <Space wrap size={12}>
            <Input
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              placeholder={t.database.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              style={{ width: 280, borderRadius: 6 }}
            />

            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 140 }}
              options={[
                { label: t.database.allStatus, value: 'All' },
                { label: t.common.online, value: 'Online' },
                { label: t.common.warning, value: 'Warning' },
                { label: t.common.offline, value: 'Offline' },
              ]}
            />

            <Select
              value={envFilter}
              onChange={setEnvFilter}
              style={{ width: 150 }}
              options={[
                { label: t.database.allEnvs, value: 'All' },
                { label: 'Production', value: 'Production' },
                { label: 'Staging', value: 'Staging' },
                { label: 'Development', value: 'Development' },
              ]}
            />

            <Select
              value={sortBy}
              onChange={setSortBy}
              style={{ width: 160 }}
              options={[
                { label: t.database.sortName, value: 'name' },
                { label: t.database.sortSize, value: 'size' },
                { label: t.database.sortTables, value: 'tables' },
                { label: t.database.sortConnections, value: 'connections' },
              ]}
            />
          </Space>

          {/* Right: Grid/List View Toggle */}
          <Radio.Group
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            size="middle"
          >
            <Radio.Button value="grid">
              <AppstoreOutlined />
            </Radio.Button>
            <Radio.Button value="list">
              <BarsOutlined />
            </Radio.Button>
          </Radio.Group>
        </div>
      </Card>

      {/* Database Content */}
      {filteredDatabases.length === 0 ? (
        <EmptyState
          title={t.database.noDatabases}
          description={t.database.noDatabasesSub}
          actionText={t.database.addBtn}
          onAction={() => setAddModalOpen(true)}
        />
      ) : viewMode === 'grid' ? (
        <Row gutter={[16, 16]}>
          {filteredDatabases.map((db) => {
            const moreMenu = [
              {
                key: 'test',
                icon: <ThunderboltOutlined />,
                label: t.database.testConnection,
                onClick: () => handleTestConnection(db),
              },
              {
                key: 'explore',
                icon: <DatabaseOutlined />,
                label: t.database.exploreBtn,
                onClick: () => navigate(`/databases/${db.id}`),
              },
              {
                key: 'settings',
                icon: <SettingOutlined />,
                label: language === 'vi' ? 'Thuộc tính kết nối' : 'Connection Properties',
                onClick: () => navigate(`/databases/${db.id}`),
              },
              { type: 'divider' as const },
              {
                key: 'delete',
                icon: <DeleteOutlined style={{ color: '#ef4444' }} />,
                label: <span style={{ color: '#ef4444' }}>{t.common.delete}</span>,
                onClick: () => handleDelete(db),
              },
            ];

            return (
              <Col xs={24} sm={12} lg={8} key={db.id}>
                <Card
                  hoverable
                  style={{
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  styles={{ body: { padding: 18 } }}
                >
                  {/* Top Bar: Title + Status */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <div
                        onClick={() => navigate(`/databases/${db.id}`)}
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: '#1677ff',
                          cursor: 'pointer',
                        }}
                      >
                        {db.name}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                        <span className="font-mono">{db.serverHost}</span> • {db.serverVersion}
                      </div>
                    </div>
                    <StatusBadge status={db.status} />
                  </div>

                  {/* Environment Tag */}
                  <div style={{ marginBottom: 14 }}>
                    <Tag
                      color={
                        db.environment === 'Production'
                          ? 'red'
                          : db.environment === 'Staging'
                          ? 'orange'
                          : 'green'
                      }
                      style={{ fontSize: 11, borderRadius: 3 }}
                    >
                      {db.environment}
                    </Tag>
                  </div>

                  {/* Stats Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: 8,
                      padding: '10px 0',
                      borderTop: '1px solid #f1f5f9',
                      borderBottom: '1px solid #f1f5f9',
                      marginBottom: 14,
                      textAlign: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{t.database.size}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                        {db.sizeGb} GB
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{t.database.tables}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                        {db.tablesCount}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{t.database.views}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                        {db.viewsCount}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{t.database.procs}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                        {db.proceduresCount}
                      </div>
                    </div>
                  </div>

                  {/* Footer: Last checked & Actions */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#94a3b8' }}>
                      <ClockCircleOutlined />
                      <span>{formatTimeAgo(db.lastChecked)}</span>
                    </div>

                    <Space size={6}>
                      <Button
                        size="small"
                        loading={testingId === db.id}
                        onClick={() => handleTestConnection(db)}
                      >
                        {t.database.testBtn}
                      </Button>
                      <Button
                        size="small"
                        type="primary"
                        onClick={() => navigate(`/databases/${db.id}`)}
                      >
                        {t.database.openBtn}
                      </Button>
                      <Dropdown menu={{ items: moreMenu }} trigger={['click']}>
                        <Button size="small" type="text" icon={<MoreOutlined />} />
                      </Dropdown>
                    </Space>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      ) : (
        /* List Mode */
        <Card style={{ borderRadius: 8, border: '1px solid #e2e8f0' }} styles={{ body: { padding: 0 } }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredDatabases.map((db, idx) => (
              <div
                key={db.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 20px',
                  borderBottom: idx < filteredDatabases.length - 1 ? '1px solid #f1f5f9' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <DatabaseOutlined style={{ fontSize: 24, color: '#1677ff' }} />
                  <div>
                    <div
                      onClick={() => navigate(`/databases/${db.id}`)}
                      style={{ fontWeight: 600, color: '#1677ff', cursor: 'pointer', fontSize: 14 }}
                    >
                      {db.name}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {db.serverHost} • {db.databaseName} • {db.serverVersion}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <Tag
                    color={
                      db.environment === 'Production'
                        ? 'red'
                        : db.environment === 'Staging'
                        ? 'orange'
                        : 'green'
                    }
                  >
                    {db.environment}
                  </Tag>
                  <StatusBadge status={db.status} />
                  <div style={{ textAlign: 'right', minWidth: 80 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{db.sizeGb} GB</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{db.tablesCount} {t.database.tables.toLowerCase()}</div>
                  </div>
                  <Space>
                    <Button size="small" onClick={() => handleTestConnection(db)}>
                      {t.database.testBtn}
                    </Button>
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => navigate(`/databases/${db.id}`)}
                    >
                      {t.database.openBtn}
                    </Button>
                  </Space>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Add Connection Modal */}
      <AddConnectionModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={(saved) => {
          setDatabases([saved, ...databases]);
        }}
      />
    </div>
  );
};
