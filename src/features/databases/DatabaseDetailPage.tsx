import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Tabs,
  Row,
  Col,
  Table,
  Button,
  Tag,
  Space,
  Typography,
  Progress,
  List,
} from 'antd';
import {
  DatabaseOutlined,
  TableOutlined,
  EyeOutlined,
  CodeOutlined,
  LineChartOutlined,
  SafetyCertificateOutlined,
  ArrowRightOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { MetricCard } from '@/components/common/MetricCard';
import { databaseService } from '@/services/databaseService';
import { tableService } from '@/services/tableService';
import { DatabaseConnection } from '@/types/database';
import { DatabaseObjectItem } from '@/types/table';

const { Text, Title } = Typography;

export const DatabaseDetailPage: React.FC = () => {
  const { databaseId = 'pmsc' } = useParams<{ databaseId: string }>();
  const navigate = useNavigate();
  const [database, setDatabase] = useState<DatabaseConnection | null>(null);
  const [objects, setObjects] = useState<DatabaseObjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      databaseService.getDatabase(databaseId),
      tableService.getDatabaseObjects(databaseId),
    ]).then(([dbRes, objRes]) => {
      setDatabase(dbRes);
      setObjects(objRes);
      setLoading(false);
    });
  }, [databaseId]);

  const tables = objects.filter((o) => o.type === 'table');
  const views = objects.filter((o) => o.type === 'view');
  const procs = objects.filter((o) => o.type === 'procedure');

  const tableColumns = [
    {
      title: 'Table Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <span
          onClick={() => navigate(`/databases/${databaseId}/tables/${name}`)}
          style={{ fontWeight: 600, color: '#1677ff', cursor: 'pointer' }}
        >
          {name}
        </span>
      ),
    },
    {
      title: 'Schema',
      dataIndex: 'schema',
      key: 'schema',
      render: (sch: string) => <Tag color="blue">{sch}</Tag>,
    },
    {
      title: 'Row Count',
      dataIndex: 'rowCount',
      key: 'rowCount',
      render: (count?: number) =>
        count !== undefined ? count.toLocaleString() : '-',
    },
    {
      title: 'Data Size',
      dataIndex: 'dataSizeMb',
      key: 'dataSizeMb',
      render: (size?: number) => (size !== undefined ? `${size} MB` : '-'),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: DatabaseObjectItem) => (
        <Button
          size="small"
          type="link"
          onClick={() => navigate(`/databases/${databaseId}/tables/${record.name}`)}
        >
          View Data <ArrowRightOutlined />
        </Button>
      ),
    },
  ];

  const viewColumns = [
    {
      title: 'View Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span className="font-mono" style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: 'Schema',
      dataIndex: 'schema',
      key: 'schema',
      render: (sch: string) => <Tag color="purple">{sch}</Tag>,
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date?: string) => date || '2022-04-01',
    },
    {
      title: 'Action',
      key: 'action',
      render: () => (
        <Button size="small" type="link">
          Query View
        </Button>
      ),
    },
  ];

  const procColumns = [
    {
      title: 'Stored Procedure',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span className="font-mono" style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: 'Schema',
      dataIndex: 'schema',
      key: 'schema',
      render: (sch: string) => <Tag color="orange">{sch}</Tag>,
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date?: string) => date || '2022-02-15',
    },
    {
      title: 'Action',
      key: 'action',
      render: () => (
        <Button size="small" icon={<PlayCircleOutlined />}>
          Execute
        </Button>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'overview',
      label: (
        <span>
          <DatabaseOutlined /> Overview
        </span>
      ),
      children: (
        <div>
          {/* Overview Metrics */}
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={24} sm={12} lg={4}>
              <MetricCard
                title="Database Size"
                value={`${database?.sizeGb ?? 482} GB`}
                subtitle={`Limit: ${database?.storageLimitGb ?? 1000} GB`}
              />
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <MetricCard
                title="Tables"
                value={database?.tablesCount ?? 326}
                subtitle="User tables"
              />
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <MetricCard
                title="Views"
                value={database?.viewsCount ?? 42}
                subtitle="Indexed & standard"
              />
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <MetricCard
                title="Stored Procedures"
                value={database?.proceduresCount ?? 82}
                subtitle="T-SQL procedures"
              />
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <MetricCard
                title="Active Connections"
                value={database?.activeConnections ?? 24}
                subtitle="Current sessions"
              />
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <MetricCard
                title="Created Date"
                value={database?.createdAt ?? '2024-05-21'}
                subtitle="Provisioned on cluster"
              />
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            {/* Storage Usage Progress */}
            <Col xs={24} lg={12}>
              <Card
                title="Storage Allocation & Limits"
                style={{ borderRadius: 8, border: '1px solid #e2e8f0', height: '100%' }}
              >
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text strong>Data File (.mdf / .ndf)</Text>
                    <Text>380 GB / 800 GB</Text>
                  </div>
                  <Progress percent={47} strokeColor="#1677ff" />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text strong>Transaction Log (.ldf)</Text>
                    <Text>102 GB / 200 GB</Text>
                  </div>
                  <Progress percent={51} strokeColor="#52c41a" />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text strong>Total Database Size</Text>
                    <Text strong>{database?.sizeGb ?? 482} GB / {database?.storageLimitGb ?? 1000} GB</Text>
                  </div>
                  <Progress percent={48} status="active" />
                </div>
              </Card>
            </Col>

            {/* Recent Activity */}
            <Col xs={24} lg={12}>
              <Card
                title="Recent Database Activity"
                style={{ borderRadius: 8, border: '1px solid #e2e8f0', height: '100%' }}
              >
                <List
                  size="small"
                  dataSource={[
                    { title: 'Checkpoint executed successfully', time: '5m ago', user: 'SYSTEM' },
                    { title: 'Index reorganization on dbo.NhanVienDaiThanh', time: '1h ago', user: 'DBA_AGENT' },
                    { title: 'Differential backup completed', time: '3h ago', user: 'SQL_BACKUP' },
                    { title: 'User loi executed bulk query on dbo.HQ_PhieuCan', time: '4h ago', user: 'loi' },
                  ]}
                  renderItem={(item) => (
                    <List.Item>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{item.title}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>
                          By {item.user} • {item.time}
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'tables',
      label: (
        <span>
          <TableOutlined /> Tables ({tables.length})
        </span>
      ),
      children: (
        <Card style={{ borderRadius: 8, border: '1px solid #e2e8f0' }} styles={{ body: { padding: 0 } }}>
          <Table
            dataSource={tables}
            columns={tableColumns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </Card>
      ),
    },
    {
      key: 'views',
      label: (
        <span>
          <EyeOutlined /> Views ({views.length})
        </span>
      ),
      children: (
        <Card style={{ borderRadius: 8, border: '1px solid #e2e8f0' }} styles={{ body: { padding: 0 } }}>
          <Table
            dataSource={views}
            columns={viewColumns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </Card>
      ),
    },
    {
      key: 'procedures',
      label: (
        <span>
          <CodeOutlined /> Stored Procedures ({procs.length})
        </span>
      ),
      children: (
        <Card style={{ borderRadius: 8, border: '1px solid #e2e8f0' }} styles={{ body: { padding: 0 } }}>
          <Table
            dataSource={procs}
            columns={procColumns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </Card>
      ),
    },
    {
      key: 'monitoring',
      label: (
        <span>
          <LineChartOutlined /> Monitoring
        </span>
      ),
      children: (
        <Card style={{ borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <Text type="secondary">
            Instance metrics, transaction rate, and query latency for {database?.name}.
          </Text>
          <div style={{ marginTop: 16 }}>
            <Button type="primary" onClick={() => navigate('/monitoring')}>
              Open Full Monitoring Dashboard
            </Button>
          </div>
        </Card>
      ),
    },
    {
      key: 'permissions',
      label: (
        <span>
          <SafetyCertificateOutlined /> Permissions
        </span>
      ),
      children: (
        <Card style={{ borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <Text type="secondary">
            Database level user permissions, roles and access control rules.
          </Text>
          <div style={{ marginTop: 16 }}>
            <Button type="primary" onClick={() => navigate('/roles')}>
              Manage Role Permissions Matrix
            </Button>
          </div>
        </Card>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={database?.name || 'Database Detail'}
        subtitle={`${database?.serverHost} • ${database?.serverVersion} • ${database?.databaseName}`}
        breadcrumbs={[
          { title: 'Dashboard', path: '/dashboard' },
          { title: 'Databases', path: '/databases' },
          { title: database?.name || databaseId },
        ]}
        badge={<StatusBadge status={database?.status || 'Online'} />}
        extra={
          <Space>
            <Button
              type="primary"
              onClick={() =>
                navigate(`/databases/${databaseId}/tables/NhanVienDaiThanh`)
              }
            >
              Open Table Data Browser
            </Button>
          </Space>
        }
      />

      <Tabs defaultActiveKey="overview" items={tabItems} />
    </div>
  );
};
