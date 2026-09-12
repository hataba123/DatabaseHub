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
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  AppstoreOutlined,
  BarsOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  MoreOutlined,
  ArrowRightOutlined,
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
import { DatabaseConnection, DatabaseEnvironment, DatabaseStatus } from '@/types/database';
import { formatTimeAgo } from '@/utils/formatters';

const { Text } = Typography;

export const DatabaseListPage: React.FC = () => {
  const navigate = useNavigate();
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
      message.success(`Connection to ${db.name} verified! Response: ${res.latencyMs}ms`);
    } else {
      message.error(`Failed to connect to ${db.name}`);
    }
  };

  const handleDelete = (db: DatabaseConnection) => {
    Modal.confirm({
      title: `Delete connection "${db.name}"?`,
      content: `Are you sure you want to remove connection to ${db.serverHost}? All saved credentials will be purged.`,
      okType: 'danger',
      okText: 'Delete Connection',
      onOk: async () => {
        await databaseService.deleteConnection(db.id);
        message.success(`Connection "${db.name}" deleted.`);
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
        title="Databases"
        subtitle="Manage database connections, explore tables, views, procedures and monitor instances."
        breadcrumbs={[{ title: 'Dashboard', path: '/dashboard' }, { title: 'Databases' }]}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setAddModalOpen(true)}
          >
            Add Database Connection
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
              placeholder="Search databases by name or host..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              style={{ width: 280, borderRadius: 6 }}
            />

            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 130 }}
              options={[
                { label: 'All Status', value: 'All' },
                { label: 'Online', value: 'Online' },
                { label: 'Warning', value: 'Warning' },
                { label: 'Offline', value: 'Offline' },
              ]}
            />

            <Select
              value={envFilter}
              onChange={setEnvFilter}
              style={{ width: 140 }}
              options={[
                { label: 'All Envs', value: 'All' },
                { label: 'Production', value: 'Production' },
                { label: 'Staging', value: 'Staging' },
                { label: 'Development', value: 'Development' },
              ]}
            />

            <Select
              value={sortBy}
              onChange={setSortBy}
              style={{ width: 150 }}
              options={[
                { label: 'Sort: Name', value: 'name' },
                { label: 'Sort: Size (High)', value: 'size' },
                { label: 'Sort: Tables Count', value: 'tables' },
                { label: 'Sort: Connections', value: 'connections' },
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
          title="No database connections"
          description="Connect your first SQL Server database to get started."
          actionText="Add Database Connection"
          onAction={() => setAddModalOpen(true)}
        />
      ) : viewMode === 'grid' ? (
        <Row gutter={[16, 16]}>
          {filteredDatabases.map((db) => {
            const moreMenu = [
              {
                key: 'test',
                icon: <ThunderboltOutlined />,
                label: 'Test Connection',
                onClick: () => handleTestConnection(db),
              },
              {
                key: 'explore',
                icon: <DatabaseOutlined />,
                label: 'Explore Objects',
                onClick: () => navigate(`/databases/${db.id}`),
              },
              {
                key: 'settings',
                icon: <SettingOutlined />,
                label: 'Connection Properties',
                onClick: () => navigate(`/databases/${db.id}`),
              },
              { type: 'divider' as const },
              {
                key: 'delete',
                icon: <DeleteOutlined style={{ color: '#ef4444' }} />,
                label: <span style={{ color: '#ef4444' }}>Delete</span>,
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
                          color: '#0f172a',
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
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>Size</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                        {db.sizeGb} GB
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>Tables</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                        {db.tablesCount}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>Views</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                        {db.viewsCount}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>Procs</div>
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
                        Test
                      </Button>
                      <Button
                        size="small"
                        type="primary"
                        onClick={() => navigate(`/databases/${db.id}`)}
                      >
                        Open
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
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{db.tablesCount} tables</div>
                  </div>
                  <Space>
                    <Button size="small" onClick={() => handleTestConnection(db)}>
                      Test
                    </Button>
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => navigate(`/databases/${db.id}`)}
                    >
                      Open
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
