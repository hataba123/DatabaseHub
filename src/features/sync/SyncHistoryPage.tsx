import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Typography,
  Drawer,
  Row,
  Col,
  Statistic,
  Badge,
  Alert,
  Modal,
  message,
} from 'antd';
import {
  HistoryOutlined,
  ReloadOutlined,
  RollbackOutlined,
  EyeOutlined,
  SyncOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { SyncExecution } from '@/types/sync';
import { syncApi } from '@/services/api/syncApi';

const { Text, Paragraph } = Typography;

export const SyncHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [executions, setExecutions] = useState<SyncExecution[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // Details drawer
  const [selectedExecution, setSelectedExecution] = useState<SyncExecution | null>(null);
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [creatingReversal, setCreatingReversal] = useState(false);

  useEffect(() => {
    loadExecutions(page, pageSize);
  }, [page, pageSize]);

  const loadExecutions = async (p = 1, ps = 20) => {
    setLoading(true);
    try {
      const res = await syncApi.getExecutions(p, ps);
      setExecutions(res.items || []);
      setTotal(res.totalRows || 0);
    } catch (err: any) {
      message.error(err.message || 'Failed to load sync execution history');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReversal = async (planId: string) => {
    setCreatingReversal(true);
    try {
      const res = await syncApi.createReversalPlan(planId);
      Modal.success({
        title: 'Reversal Plan Created',
        content: (
          <div>
            <p>{res.message}</p>
            <p>New Reversal Plan ID: <Text code>{res.newPlanId}</Text></p>
            <p>Operations: <strong>{res.operationsCount}</strong></p>
          </div>
        ),
        okText: 'Open Reversal Plan in Wizard',
        onOk: () => {
          navigate(`/sync?planId=${res.newPlanId}`);
        },
      });
    } catch (err: any) {
      message.error(err.message || 'Failed to create reversal plan');
    } finally {
      setCreatingReversal(false);
    }
  };

  const columns = [
    {
      title: 'Execution ID',
      dataIndex: 'id',
      key: 'id',
      width: 140,
      render: (id: string) => (
        <Text copyable={{ text: id }} className="font-mono">
          {id.substring(0, 8)}...
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: string) => {
        if (status === 'Completed') return <Tag color="success">Completed</Tag>;
        if (status === 'CompletedWithErrors') return <Tag color="warning">With Errors</Tag>;
        if (status === 'Failed') return <Tag color="error">Failed</Tag>;
        if (status === 'Cancelled') return <Tag color="default">Cancelled</Tag>;
        if (status === 'Running') return <Tag color="processing" icon={<SyncOutlined spin />}>Running</Tag>;
        return <Tag color="default">{status}</Tag>;
      },
    },
    {
      title: 'Initiated By',
      dataIndex: 'startedByUsername',
      key: 'startedByUsername',
      render: (user: string) => <span>{user || 'System'}</span>,
    },
    {
      title: 'Started At',
      dataIndex: 'startedAt',
      key: 'startedAt',
      render: (d: string) => new Date(d).toLocaleString(),
    },
    {
      title: 'Completed At',
      dataIndex: 'completedAt',
      key: 'completedAt',
      render: (d?: string) => (d ? new Date(d).toLocaleString() : '—'),
    },
    {
      title: 'Progress',
      key: 'progress',
      render: (_: any, r: SyncExecution) => (
        <Space direction="vertical" size={2}>
          <Text style={{ fontSize: 12 }}>
            {r.completedOperations} / {r.totalOperations} ({r.progressPercent}%)
          </Text>
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_: any, r: SyncExecution) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedExecution(r);
              setDetailsDrawerOpen(true);
            }}
          >
            Details
          </Button>
          <Button
            size="small"
            icon={<RollbackOutlined />}
            loading={creatingReversal}
            onClick={() => handleCreateReversal(r.syncPlanId)}
          >
            Rollback
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Sync Execution History"
        subtitle="Chronological audit log of all database synchronization runs and reversal plans."
        breadcrumbs={[
          { title: 'Dashboard', path: '/dashboard' },
          { title: 'Sync', path: '/sync' },
          { title: 'History' },
        ]}
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => loadExecutions(page, pageSize)}
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<SyncOutlined />}
              onClick={() => navigate('/sync')}
            >
              New Sync
            </Button>
          </Space>
        }
      />

      <Card style={{ borderRadius: 8 }}>
        <Table
          dataSource={executions}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>

      {/* Execution Details Drawer */}
      <Drawer
        title={`Sync Execution: ${selectedExecution?.id.substring(0, 8)}...`}
        placement="right"
        width={600}
        open={detailsDrawerOpen}
        onClose={() => {
          setDetailsDrawerOpen(false);
          setSelectedExecution(null);
        }}
      >
        {selectedExecution && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {selectedExecution.errorMessage && (
              <Alert
                type="error"
                showIcon
                message="Execution Error"
                description={selectedExecution.errorMessage}
              />
            )}

            <Card size="small" style={{ background: '#f8fafc' }}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic title="Total Operations" value={selectedExecution.totalOperations} />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Completed"
                    value={selectedExecution.completedOperations}
                    valueStyle={{ color: '#16a34a' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Failed"
                    value={selectedExecution.failedOperations}
                    valueStyle={{ color: '#dc2626' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Skipped / Conflicts"
                    value={selectedExecution.skippedOperations + selectedExecution.conflictOperations}
                    valueStyle={{ color: '#d97706' }}
                  />
                </Col>
              </Row>
            </Card>

            <div>
              <Text strong>Execution Metadata:</Text>
              <div style={{ marginTop: 8 }}>
                <div>• Sync Plan ID: <Text code>{selectedExecution.syncPlanId}</Text></div>
                <div>• Started By: <strong>{selectedExecution.startedByUsername}</strong></div>
                <div>• Started At: {new Date(selectedExecution.startedAt).toLocaleString()}</div>
                {selectedExecution.completedAt && (
                  <div>• Completed At: {new Date(selectedExecution.completedAt).toLocaleString()}</div>
                )}
                {selectedExecution.currentTable && (
                  <div>• Last Table Processed: <Text code>{selectedExecution.currentTable}</Text></div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <Button
                type="primary"
                icon={<RollbackOutlined />}
                loading={creatingReversal}
                onClick={() => handleCreateReversal(selectedExecution.syncPlanId)}
              >
                Generate Reversal Plan (Rollback)
              </Button>
              <Button onClick={() => navigate('/audit-logs')}>
                View Audit Trail
              </Button>
            </div>
          </Space>
        )}
      </Drawer>
    </div>
  );
};
