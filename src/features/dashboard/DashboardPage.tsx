import React, { useEffect, useState } from 'react';
import {
  Row,
  Col,
  Card,
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Progress,
} from 'antd';
import {
  PlusOutlined,
  DiffOutlined,
  HistoryOutlined,
  LineChartOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  HddOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { PageHeader } from '@/components/common/PageHeader';
import { MetricCard } from '@/components/common/MetricCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { AddConnectionModal } from '@/components/database/AddConnectionModal';
import { databaseService } from '@/services/databaseService';
import { DatabaseConnection, DatabaseStats } from '@/types/database';
import { useTranslation } from '@/locales';

const { Title, Text } = Typography;

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [databases, setDatabases] = useState<DatabaseConnection[]>([]);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [storageData, setStorageData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      databaseService.getDashboardStats(),
      databaseService.getDatabases(),
      databaseService.getActivityHistory(),
      databaseService.getStorageBreakdown(),
    ]).then(([statsRes, dbRes, actRes, storRes]) => {
      setStats(statsRes);
      setDatabases(dbRes);
      setActivityData(actRes);
      setStorageData(storRes);
      setLoading(false);
    });
  }, []);

  const healthColumns = [
    {
      title: language === 'vi' ? 'Cơ sở dữ liệu' : 'Database',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: DatabaseConnection) => (
        <div>
          <div
            onClick={() => navigate(`/databases/${record.id}`)}
            style={{ fontWeight: 600, color: '#1677ff', cursor: 'pointer' }}
          >
            {text}
          </div>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {record.databaseName}
          </Text>
        </div>
      ),
    },
    {
      title: language === 'vi' ? 'Máy chủ' : 'Server',
      dataIndex: 'serverHost',
      key: 'serverHost',
      render: (host: string) => <span className="font-mono">{host}</span>,
    },
    {
      title: language === 'vi' ? 'Trạng thái' : 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <StatusBadge status={status} />,
    },
    {
      title: language === 'vi' ? 'Dung lượng' : 'Size',
      dataIndex: 'sizeGb',
      key: 'sizeGb',
      render: (size: number) => <span style={{ fontWeight: 500 }}>{size} GB</span>,
    },
    {
      title: language === 'vi' ? 'Kết nối' : 'Connections',
      dataIndex: 'activeConnections',
      key: 'activeConnections',
      align: 'center' as const,
      render: (val: number) => <Tag color="geekblue">{val}</Tag>,
    },
    {
      title: language === 'vi' ? 'Thao tác' : 'Action',
      key: 'action',
      align: 'right' as const,
      render: (_: any, record: DatabaseConnection) => (
        <Button
          type="link"
          size="small"
          onClick={() => navigate(`/databases/${record.id}`)}
        >
          {t.database.exploreBtn} <ArrowRightOutlined />
        </Button>
      ),
    },
  ];

  return (
    <div>
      {/* Page Header */}
      <PageHeader
        title={t.dashboard.title}
        subtitle={t.dashboard.subtitle}
        extra={
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAddModalOpen(true)}
            >
              {t.dashboard.addConnection}
            </Button>
          </Space>
        }
      />

      {/* Top 5 Metric Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={4}>
          <MetricCard
            title={t.dashboard.connectedDatabases}
            value={stats?.connectedDatabases ?? 8}
            loading={loading}
            icon={<DatabaseOutlined style={{ color: '#1677ff' }} />}
            subtitle={
              <Space size={4} style={{ fontSize: 11 }}>
                <span style={{ color: '#10b981', fontWeight: 600 }}>{stats?.onlineCount ?? 6} Online</span>
                <span>•</span>
                <span style={{ color: '#f59e0b', fontWeight: 600 }}>{stats?.warningCount ?? 1} Warn</span>
                <span>•</span>
                <span style={{ color: '#ef4444', fontWeight: 600 }}>{stats?.offlineCount ?? 1} Off</span>
              </Space>
            }
          />
        </Col>

        <Col xs={24} sm={12} lg={5}>
          <MetricCard
            title={t.dashboard.activeConnections}
            value={stats?.activeConnections ?? 42}
            loading={loading}
            icon={<ThunderboltOutlined style={{ color: '#10b981' }} />}
            subtitle={language === 'vi' ? 'Trên toàn bộ máy chủ SQL Server' : 'Across all SQL Server instances'}
          />
        </Col>

        <Col xs={24} sm={12} lg={5}>
          <MetricCard
            title={t.dashboard.queriesPerMin}
            value={(stats?.queriesPerMinute ?? 1482).toLocaleString()}
            loading={loading}
            icon={<LineChartOutlined style={{ color: '#8b5cf6' }} />}
            subtitle={language === 'vi' ? '+8.4% so với giờ trước' : '+8.4% compared to last hour'}
          />
        </Col>

        <Col xs={24} sm={12} lg={4}>
          <MetricCard
            title={t.dashboard.slowQueries}
            value={stats?.slowQueries ?? 12}
            loading={loading}
            icon={<ClockCircleOutlined style={{ color: '#f59e0b' }} />}
            subtitle={language === 'vi' ? 'Thời gian chạy > 1,500ms' : 'Execution time > 1,500ms'}
          />
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <MetricCard
            title={t.dashboard.storageUsed}
            value={`${stats?.storageUsedGb ?? 482} GB / ${(stats?.storageTotalGb ?? 1000) / 1000} TB`}
            loading={loading}
            icon={<HddOutlined style={{ color: '#0ea5e9' }} />}
            subtitle={
              <Progress
                percent={Math.round(((stats?.storageUsedGb ?? 482) / (stats?.storageTotalGb ?? 1000)) * 100)}
                size="small"
                status="normal"
                strokeColor="#1677ff"
                style={{ margin: 0 }}
              />
            }
          />
        </Col>
      </Row>

      {/* Charts Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Database Activity Line Chart */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{t.dashboard.activityTitle}</span>
                <Tag color="blue">{language === 'vi' ? 'Thời gian thực (10 phút)' : 'Real-time (10m window)'}</Tag>
              </div>
            }
            style={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
            styles={{ body: { padding: '16px 20px 8px 10px' } }}
          >
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData}>
                  <defs>
                    <linearGradient id="colorQueries" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1677ff" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#1677ff" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: 6,
                      border: 'none',
                      color: '#ffffff',
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="queriesPerMin"
                    name={language === 'vi' ? 'Truy vấn/phút' : 'Queries/min'}
                    stroke="#1677ff"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorQueries)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        {/* Storage Usage Bar Chart */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{t.dashboard.storageTitle}</span>
                <span style={{ fontSize: 12, color: '#64748b' }}>{language === 'vi' ? 'Dung lượng GB' : 'Capacity GB'}</span>
              </div>
            }
            style={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
            styles={{ body: { padding: '16px 20px 8px 10px' } }}
          >
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={storageData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={12} unit=" GB" />
                  <YAxis type="category" dataKey="name" width={110} stroke="#475569" fontSize={11} />
                  <Tooltip
                    formatter={(val) => [`${val} GB`, language === 'vi' ? 'Dung lượng' : 'Allocated Size']}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: 6,
                      border: 'none',
                      color: '#ffffff',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="sizeGb" radius={[0, 4, 4, 0]}>
                    {storageData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color || '#1677ff'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Database Health & Quick Actions */}
      <Row gutter={[16, 16]}>
        {/* Database Health Table */}
        <Col xs={24} lg={17}>
          <Card
            title={<span style={{ fontSize: 14, fontWeight: 600 }}>{t.dashboard.healthTitle}</span>}
            extra={
              <Button type="link" size="small" onClick={() => navigate('/databases')}>
                {t.dashboard.viewAllDatabases}
              </Button>
            }
            style={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
            styles={{ body: { padding: 0 } }}
          >
            <Table
              dataSource={databases.slice(0, 4)}
              columns={healthColumns}
              rowKey="id"
              pagination={false}
              size="middle"
            />
          </Card>
        </Col>

        {/* Quick Actions */}
        <Col xs={24} lg={7}>
          <Card
            title={<span style={{ fontSize: 14, fontWeight: 600 }}>{t.dashboard.quickActions}</span>}
            style={{ borderRadius: 8, border: '1px solid #e2e8f0', height: '100%' }}
            styles={{ body: { padding: 16 } }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Button
                block
                style={{ textAlign: 'left', height: 44, display: 'flex', alignItems: 'center' }}
                icon={<PlusOutlined style={{ color: '#1677ff' }} />}
                onClick={() => setAddModalOpen(true)}
              >
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{t.dashboard.addConnection}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{t.dashboard.addConnectionSub}</div>
                </div>
              </Button>

              <Button
                block
                style={{ textAlign: 'left', height: 44, display: 'flex', alignItems: 'center' }}
                icon={<DiffOutlined style={{ color: '#8b5cf6' }} />}
                onClick={() => navigate('/compare')}
              >
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{t.dashboard.compareDatabases}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{t.dashboard.compareDatabasesSub}</div>
                </div>
              </Button>

              <Button
                block
                style={{ textAlign: 'left', height: 44, display: 'flex', alignItems: 'center' }}
                icon={<HistoryOutlined style={{ color: '#10b981' }} />}
                onClick={() => navigate('/audit-logs')}
              >
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{t.dashboard.openAuditLogs}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{t.dashboard.openAuditLogsSub}</div>
                </div>
              </Button>

              <Button
                block
                style={{ textAlign: 'left', height: 44, display: 'flex', alignItems: 'center' }}
                icon={<LineChartOutlined style={{ color: '#f59e0b' }} />}
                onClick={() => navigate('/monitoring')}
              >
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{t.dashboard.viewMonitoring}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{t.dashboard.viewMonitoringSub}</div>
                </div>
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

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
