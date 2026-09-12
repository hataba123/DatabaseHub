import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Select,
  Button,
  Table,
  Tag,
  Modal,
  Drawer,
  Space,
  Typography,
  Divider,
  message,
} from 'antd';
import {
  DiffOutlined,
  SwapOutlined,
  ArrowRightOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { compareService } from '@/services/compareService';
import { TableCompareResult, RowCompareResult } from '@/types/compare';

const { Text, Title } = Typography;

export const ComparePage: React.FC = () => {
  const navigate = useNavigate();
  const [sourceDb, setSourceDb] = useState('pmsc');
  const [targetDb, setTargetDb] = useState('pmsc-backup');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TableCompareResult[]>([]);
  const [hasCompared, setHasCompared] = useState(false);

  // Row compare drawer
  const [rowCompareOpen, setRowCompareOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [rowDiffs, setRowDiffs] = useState<RowCompareResult[]>([]);
  const [loadingRowDiffs, setLoadingRowDiffs] = useState(false);

  // Side-by-side single record modal
  const [activeRecordDiff, setActiveRecordDiff] = useState<RowCompareResult | null>(null);

  const handleRunCompare = async () => {
    setLoading(true);
    const res = await compareService.getTableComparisons(sourceDb, targetDb);
    setResults(res);
    setHasCompared(true);
    setLoading(false);
  };

  const handleOpenRowCompare = async (tableName: string) => {
    setSelectedTable(tableName);
    setRowCompareOpen(true);
    setLoadingRowDiffs(true);
    const diffs = await compareService.getRowComparisons(sourceDb, targetDb, tableName);
    setRowDiffs(diffs);
    setLoadingRowDiffs(false);
  };

  const handleCopyDirection = (direction: 'source-to-target' | 'target-to-source') => {
    Modal.confirm({
      title: `Copy ${direction === 'source-to-target' ? 'Source → Target' : 'Target → Source'}?`,
      icon: <ExclamationCircleOutlined style={{ color: '#1677ff' }} />,
      content: 'This will synchronize the record data between databases. (Demo mock action)',
      okText: 'Confirm Copy',
      onOk: () => {
        message.success('Record synchronized successfully.');
        setActiveRecordDiff(null);
      },
    });
  };

  const tableColumns = [
    {
      title: 'Table Name',
      dataIndex: 'tableName',
      key: 'tableName',
      render: (name: string) => <span style={{ fontWeight: 600, color: '#0f172a' }}>{name}</span>,
    },
    {
      title: 'Source Rows',
      dataIndex: 'sourceRowCount',
      key: 'sourceRowCount',
      render: (count: number) => count.toLocaleString(),
    },
    {
      title: 'Target Rows',
      dataIndex: 'targetRowCount',
      key: 'targetRowCount',
      render: (count: number) => count.toLocaleString(),
    },
    {
      title: 'Differences',
      dataIndex: 'differencesCount',
      key: 'differencesCount',
      render: (diff: number) =>
        diff > 0 ? (
          <Tag color="error">{diff} differences</Tag>
        ) : (
          <Tag color="success">0 differences</Tag>
        ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        switch (status) {
          case 'Same':
            return <Tag color="success">Same</Tag>;
          case 'Different':
            return <Tag color="warning">Different</Tag>;
          case 'Missing in Target':
            return <Tag color="error">Missing in Target</Tag>;
          default:
            return <Tag>{status}</Tag>;
        }
      },
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: TableCompareResult) => (
        <Button
          size="small"
          type="link"
          disabled={record.differencesCount === 0}
          onClick={() => handleOpenRowCompare(record.tableName)}
        >
          View Row Diff <ArrowRightOutlined />
        </Button>
      ),
    },
  ];

  const rowDiffColumns = [
    {
      title: 'Primary Key',
      dataIndex: 'primaryKey',
      key: 'primaryKey',
      render: (pk: string) => <span className="font-mono" style={{ fontWeight: 600 }}>{pk}</span>,
    },
    {
      title: 'Source Status',
      dataIndex: 'sourceStatus',
      key: 'sourceStatus',
      render: (status: string) => <Tag color={status === 'Exists' ? 'blue' : 'default'}>{status}</Tag>,
    },
    {
      title: 'Target Status',
      dataIndex: 'targetStatus',
      key: 'targetStatus',
      render: (status: string) => <Tag color={status === 'Exists' ? 'purple' : 'default'}>{status}</Tag>,
    },
    {
      title: 'Comparison Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        switch (status) {
          case 'Same':
            return <Tag color="success">Same</Tag>;
          case 'Different':
            return <Tag color="warning">Different</Tag>;
          case 'Missing in Target':
            return <Tag color="error">Missing Target</Tag>;
          default:
            return <Tag>{status}</Tag>;
        }
      },
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: RowCompareResult) => (
        <Button size="small" onClick={() => setActiveRecordDiff(record)}>
          Compare Fields
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Database Compare"
        subtitle="Compare schema, row counts and record content between two database environments."
        breadcrumbs={[{ title: 'Dashboard', path: '/dashboard' }, { title: 'Compare' }]}
      />

      {/* Comparison Selector Card */}
      <Card
        style={{ marginBottom: 20, borderRadius: 8, border: '1px solid #e2e8f0' }}
        styles={{ body: { padding: 20 } }}
      >
        <Row gutter={[24, 16]} align="middle">
          <Col xs={24} md={10}>
            <div style={{ marginBottom: 6 }}>
              <Text strong style={{ fontSize: 13, color: '#475569' }}>
                Source Database (Reference)
              </Text>
            </div>
            <Select
              value={sourceDb}
              onChange={setSourceDb}
              style={{ width: '100%' }}
              options={[
                { label: 'PMSC Production (DB-SRV-01)', value: 'pmsc' },
                { label: 'HR Database (DB-SRV-02)', value: 'hr' },
                { label: 'ERP Production (DB-SRV-01)', value: 'erp' },
              ]}
            />
          </Col>

          <Col xs={24} md={4} style={{ textAlign: 'center' }}>
            <SwapOutlined style={{ fontSize: 22, color: '#94a3b8', marginTop: 20 }} />
          </Col>

          <Col xs={24} md={10}>
            <div style={{ marginBottom: 6 }}>
              <Text strong style={{ fontSize: 13, color: '#475569' }}>
                Target Database (Target to Sync)
              </Text>
            </div>
            <Select
              value={targetDb}
              onChange={setTargetDb}
              style={{ width: '100%' }}
              options={[
                { label: 'PMSC Backup (DB-SRV-04)', value: 'pmsc-backup' },
                { label: 'Testing Database (DB-SRV-DEV)', value: 'testing-db' },
                { label: 'Reporting Database (DB-SRV-05)', value: 'reporting' },
              ]}
            />
          </Col>
        </Row>

        <Divider style={{ margin: '16px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Button
            type="primary"
            icon={<DiffOutlined />}
            loading={loading}
            onClick={handleRunCompare}
          >
            Run Comparison
          </Button>
        </div>
      </Card>

      {/* Results Table */}
      {hasCompared && (
        <Card
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Table Comparison Results</span>
              <Space>
                <Tag color="error">2 Tables with Differences</Tag>
                <Tag color="success">3 Tables Identical</Tag>
              </Space>
            </div>
          }
          extra={
            <Button
              type="primary"
              icon={<SyncOutlined />}
              onClick={() => navigate('/sync')}
            >
              Proceed to Sync Engine
            </Button>
          }
          style={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
          styles={{ body: { padding: 0 } }}
        >
          <Table
            dataSource={results}
            columns={tableColumns}
            rowKey="tableName"
            pagination={false}
          />
        </Card>
      )}

      {/* Row Differences Drawer */}
      <Drawer
        title={`Row Comparisons: dbo.${selectedTable}`}
        width={720}
        open={rowCompareOpen}
        onClose={() => setRowCompareOpen(false)}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Detailed breakdown of records that differ or are missing between Source and Target.
          </Text>
        </div>
        <Table
          loading={loadingRowDiffs}
          dataSource={rowDiffs}
          columns={rowDiffColumns}
          rowKey="primaryKey"
          pagination={false}
          size="small"
        />
      </Drawer>

      {/* Side-by-Side Record Diff Modal */}
      <Modal
        title={`Compare Record: ${activeRecordDiff?.primaryKey}`}
        open={!!activeRecordDiff}
        onCancel={() => setActiveRecordDiff(null)}
        width={760}
        footer={[
          <Button key="copy-s2t" icon={<CopyOutlined />} onClick={() => handleCopyDirection('source-to-target')}>
            Copy Source → Target
          </Button>,
          <Button key="copy-t2s" icon={<CopyOutlined />} onClick={() => handleCopyDirection('target-to-source')}>
            Copy Target → Source
          </Button>,
          <Button key="close" type="primary" onClick={() => setActiveRecordDiff(null)}>
            Done
          </Button>,
        ]}
      >
        {activeRecordDiff && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Source Column */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 6,
                  border: '1px solid #bfdbfe',
                  backgroundColor: '#eff6ff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text strong style={{ color: '#1d4ed8' }}>SOURCE (PMSC Production)</Text>
                  <Tag color="blue">{activeRecordDiff.sourceStatus}</Tag>
                </div>
                {activeRecordDiff.sourceData ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Object.entries(activeRecordDiff.sourceData).map(([k, v]) => (
                      <div key={k} style={{ fontSize: 12 }}>
                        <span style={{ color: '#64748b' }}>{k}: </span>
                        <span style={{ fontWeight: 600 }}>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>Record missing in Source</div>
                )}
              </div>

              {/* Target Column */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 6,
                  border: '1px solid #fed7aa',
                  backgroundColor: '#fffbeb',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text strong style={{ color: '#b45309' }}>TARGET (PMSC Backup)</Text>
                  <Tag color="orange">{activeRecordDiff.targetStatus}</Tag>
                </div>
                {activeRecordDiff.targetData ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Object.entries(activeRecordDiff.targetData).map(([k, v]) => (
                      <div key={k} style={{ fontSize: 12 }}>
                        <span style={{ color: '#64748b' }}>{k}: </span>
                        <span style={{ fontWeight: 600 }}>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>Record missing in Target</div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
