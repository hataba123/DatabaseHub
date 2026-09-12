import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Table,
  Tag,
  Typography,
  Progress,
  Tabs,
} from 'antd';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  DashboardOutlined,
  ThunderboltOutlined,
  HddOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { PageHeader } from '@/components/common/PageHeader';
import { MetricCard } from '@/components/common/MetricCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { monitoringService } from '@/services/monitoringService';
import {
  LargestTable,
  ServerHealth,
  ServerMetric,
  SlowQuery,
} from '@/types/monitoring';

const { Text } = Typography;

export const MonitoringPage: React.FC = () => {
  const [metrics, setMetrics] = useState<ServerMetric | null>(null);
  const [slowQueries, setSlowQueries] = useState<SlowQuery[]>([]);
  const [largestTables, setLargestTables] = useState<LargestTable[]>([]);
  const [serverHealth, setServerHealth] = useState<ServerHealth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      monitoringService.getMetrics(),
      monitoringService.getSlowQueries(),
      monitoringService.getLargestTables(),
      monitoringService.getServerHealth(),
    ]).then(([metRes, sqRes, ltRes, shRes]) => {
      setMetrics(metRes);
      setSlowQueries(sqRes);
      setLargestTables(ltRes);
      setServerHealth(shRes);
      setLoading(false);
    });
  }, []);

  const slowQueryColumns = [
    {
      title: 'Duration',
      dataIndex: 'durationMs',
      key: 'durationMs',
      width: 100,
      render: (ms: number) => (
        <Tag color="error" style={{ fontWeight: 600 }}>
          {(ms / 1000).toFixed(2)}s
        </Tag>
      ),
    },
    {
      title: 'Database',
      dataIndex: 'database',
      key: 'database',
      width: 150,
      render: (db: string) => <Tag color="blue">{db}</Tag>,
    },
    {
      title: 'Query (T-SQL)',
      dataIndex: 'query',
      key: 'query',
      render: (q: string) => (
        <code className="font-mono" style={{ fontSize: 11, color: '#0f172a' }}>
          {q.length > 80 ? q.substring(0, 80) + '...' : q}
        </code>
      ),
    },
    {
      title: 'CPU (ms)',
      dataIndex: 'cpuMs',
      key: 'cpuMs',
      width: 90,
      render: (cpu: number) => `${cpu}ms`,
    },
    {
      title: 'Logical Reads',
      dataIndex: 'reads',
      key: 'reads',
      width: 110,
      render: (reads: number) => reads.toLocaleString(),
    },
    {
      title: 'Executed At',
      dataIndex: 'executedAt',
      key: 'executedAt',
      width: 150,
    },
  ];

  const largestTableColumns = [
    {
      title: 'Table',
      dataIndex: 'tableName',
      key: 'tableName',
      render: (t: string) => <span className="font-mono" style={{ fontWeight: 600 }}>{t}</span>,
    },
    {
      title: 'Database',
      dataIndex: 'database',
      key: 'database',
      render: (db: string) => <Tag color="blue">{db}</Tag>,
    },
    {
      title: 'Rows',
      dataIndex: 'rows',
      key: 'rows',
      render: (r: number) => r.toLocaleString(),
    },
    {
      title: 'Data Size',
      dataIndex: 'dataSizeMb',
      key: 'dataSizeMb',
      render: (mb: number) => `${mb.toFixed(1)} MB`,
    },
    {
      title: 'Index Size',
      dataIndex: 'indexSizeMb',
      key: 'indexSizeMb',
      render: (mb: number) => `${mb.toFixed(1)} MB`,
    },
    {
      title: 'Total Size',
      dataIndex: 'totalSizeMb',
      key: 'totalSizeMb',
      render: (mb: number) => <strong>{mb.toFixed(1)} MB</strong>,
    },
  ];

  const serverHealthColumns = [
    {
      title: 'Database',
      dataIndex: 'database',
      key: 'database',
      render: (db: string) => <strong>{db}</strong>,
    },
    {
      title: 'Server Host',
      dataIndex: 'server',
      key: 'server',
      render: (srv: string) => <span className="font-mono">{srv}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <StatusBadge status={status} />,
    },
    {
      title: 'Latency',
      dataIndex: 'latencyMs',
      key: 'latencyMs',
      render: (ms: number) =>
        ms === 0 ? '-' : <Tag color={ms > 30 ? 'orange' : 'green'}>{ms}ms</Tag>,
    },
    {
      title: 'Connections',
      dataIndex: 'connections',
      key: 'connections',
    },
    {
      title: 'Last Backup',
      dataIndex: 'lastBackup',
      key: 'lastBackup',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Monitoring & Diagnostics"
        subtitle="Real-time SQL Server performance metrics, system resource utilization, and query bottlenecks."
        breadcrumbs={[{ title: 'Dashboard', path: '/dashboard' }, { title: 'Monitoring' }]}
      />

      {/* Top 5 Metrics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={4}>
          <MetricCard
            title="CPU Usage"
            value={`${metrics?.cpuUsage ?? 42}%`}
            loading={loading}
            icon={<DashboardOutlined style={{ color: '#1677ff' }} />}
            subtitle={
              <Progress percent={metrics?.cpuUsage ?? 42} showInfo={false} size="small" />
            }
          />
        </Col>
        <Col xs={24} sm={12} lg={4}>
          <MetricCard
            title="Memory Usage"
            value={`${metrics?.memoryUsage ?? 68}%`}
            loading={loading}
            icon={<HddOutlined style={{ color: '#8b5cf6' }} />}
            subtitle={
              <Progress percent={metrics?.memoryUsage ?? 68} showInfo={false} size="small" strokeColor="#8b5cf6" />
            }
          />
        </Col>
        <Col xs={24} sm={12} lg={5}>
          <MetricCard
            title="Active Connections"
            value={metrics?.activeConnections ?? 42}
            loading={loading}
            icon={<ThunderboltOutlined style={{ color: '#10b981' }} />}
            subtitle="Across all instances"
          />
        </Col>
        <Col xs={24} sm={12} lg={5}>
          <MetricCard
            title="Queries / sec"
            value={metrics?.queriesPerSecond ?? 24}
            loading={loading}
            icon={<ClockCircleOutlined style={{ color: '#f59e0b' }} />}
            subtitle="Peak: 45 queries/sec"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <MetricCard
            title="Database Size"
            value={`${metrics?.databaseSizeGb ?? 482} GB`}
            loading={loading}
            icon={<DatabaseOutlined style={{ color: '#0ea5e9' }} />}
            subtitle="PMSC Production Primary"
          />
        </Col>
      </Row>

      {/* Performance Charts */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card
            title="CPU & Memory Utilization (%)"
            style={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
            styles={{ body: { padding: '16px 20px 8px 10px' } }}
          >
            <div style={{ height: 230 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics?.history}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="cpu" name="CPU %" stroke="#1677ff" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="memory" name="Memory %" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title="Query Throughput (Queries / Minute)"
            style={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
            styles={{ body: { padding: '16px 20px 8px 10px' } }}
          >
            <div style={{ height: 230 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics?.history}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip />
                  <Line type="monotone" dataKey="queriesPerMin" name="Queries/min" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Tables Section */}
      <Tabs
        defaultActiveKey="slow-queries"
        items={[
          {
            key: 'slow-queries',
            label: `Slow Queries (${slowQueries.length})`,
            children: (
              <Card style={{ borderRadius: 8, border: '1px solid #e2e8f0' }} styles={{ body: { padding: 0 } }}>
                <Table
                  dataSource={slowQueries}
                  columns={slowQueryColumns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              </Card>
            ),
          },
          {
            key: 'largest-tables',
            label: `Largest Tables (${largestTables.length})`,
            children: (
              <Card style={{ borderRadius: 8, border: '1px solid #e2e8f0' }} styles={{ body: { padding: 0 } }}>
                <Table
                  dataSource={largestTables}
                  columns={largestTableColumns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              </Card>
            ),
          },
          {
            key: 'server-health',
            label: `Server Health (${serverHealth.length})`,
            children: (
              <Card style={{ borderRadius: 8, border: '1px solid #e2e8f0' }} styles={{ body: { padding: 0 } }}>
                <Table
                  dataSource={serverHealth}
                  columns={serverHealthColumns}
                  rowKey="database"
                  pagination={false}
                  size="small"
                />
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
};
