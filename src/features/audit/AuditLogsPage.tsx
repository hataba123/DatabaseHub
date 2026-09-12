import React, { useState, useEffect } from 'react';
import {
  Card,
  Input,
  Select,
  Button,
  Space,
  Tag,
  Drawer,
  Descriptions,
  Typography,
  Row,
  Col,
} from 'antd';
import {
  SearchOutlined,
  HistoryOutlined,
  EyeOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { JsonViewer } from '@/components/common/JsonViewer';
import { auditService } from '@/services/auditService';
import { AuditLog } from '@/types/audit';

const { Text } = Typography;

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dbFilter, setDbFilter] = useState('All');
  const [actionFilter, setActionFilter] = useState('All');

  const fetchLogs = async () => {
    setLoading(true);
    const data = await auditService.getLogs({
      user: userFilter,
      database: dbFilter,
      action: actionFilter,
      search,
    });
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [userFilter, dbFilter, actionFilter, search]);

  const columns = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 160,
      render: (t: string) => <span className="font-mono" style={{ fontSize: 12 }}>{t}</span>,
    },
    {
      title: 'User',
      dataIndex: 'user',
      key: 'user',
      width: 100,
      render: (u: string) => <span style={{ fontWeight: 600 }}>{u}</span>,
    },
    {
      title: 'Database',
      dataIndex: 'database',
      key: 'database',
      width: 110,
      render: (db: string) => <Tag color="blue">{db}</Tag>,
    },
    {
      title: 'Table',
      dataIndex: 'table',
      key: 'table',
      width: 160,
      render: (tbl: string) => <span className="font-mono">{tbl}</span>,
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (act: string) => {
        switch (act) {
          case 'INSERT':
            return <Tag color="green">INSERT</Tag>;
          case 'UPDATE':
            return <Tag color="blue">UPDATE</Tag>;
          case 'DELETE':
            return <Tag color="red">DELETE</Tag>;
          default:
            return <Tag>{act}</Tag>;
        }
      },
    },
    {
      title: 'Record Key',
      dataIndex: 'recordKey',
      key: 'recordKey',
      width: 130,
      render: (rk: string) => <span className="font-mono" style={{ color: '#1677ff' }}>{rk}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (st: string) => <StatusBadge status={st} />,
    },
    {
      title: 'Action',
      key: 'actionBtn',
      width: 80,
      render: (_: any, record: AuditLog) => (
        <Button
          size="small"
          type="link"
          icon={<EyeOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedLog(record);
          }}
        >
          View Diff
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        subtitle="Track all database modifications, query executions and administrative changes across instances."
        breadcrumbs={[{ title: 'Dashboard', path: '/dashboard' }, { title: 'Audit Logs' }]}
      />

      {/* Filters Card */}
      <Card
        style={{ marginBottom: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}
        styles={{ body: { padding: '12px 16px' } }}
      >
        <Space wrap size={12}>
          <Input
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="Search by key, user or table..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: 260 }}
          />

          <Select
            value={dbFilter}
            onChange={setDbFilter}
            style={{ width: 150 }}
            options={[
              { label: 'All Databases', value: 'All' },
              { label: 'PMSC', value: 'PMSC' },
              { label: 'HR', value: 'HR' },
              { label: 'Weigh Station', value: 'Weigh Station' },
              { label: 'ERP', value: 'ERP' },
            ]}
          />

          <Select
            value={actionFilter}
            onChange={setActionFilter}
            style={{ width: 140 }}
            options={[
              { label: 'All Actions', value: 'All' },
              { label: 'INSERT', value: 'INSERT' },
              { label: 'UPDATE', value: 'UPDATE' },
              { label: 'DELETE', value: 'DELETE' },
            ]}
          />
        </Space>
      </Card>

      {/* Logs Table */}
      <DataTable
        columns={columns}
        dataSource={logs}
        loading={loading}
        rowKey="id"
        onRowClick={(rec) => setSelectedLog(rec)}
        pagination={{ pageSize: 15 }}
      />

      {/* Audit Detail Drawer with Diff */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HistoryOutlined style={{ color: '#1677ff' }} />
            <span>Audit Trail Details: {selectedLog?.recordKey}</span>
          </div>
        }
        width={680}
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
      >
        {selectedLog && (
          <div>
            <Descriptions
              bordered
              size="small"
              column={2}
              style={{ marginBottom: 20 }}
              styles={{ label: { width: 110, backgroundColor: '#f8fafc', fontWeight: 500 } }}
            >
              <Descriptions.Item label="Action">
                <Tag color={selectedLog.action === 'INSERT' ? 'green' : selectedLog.action === 'UPDATE' ? 'blue' : 'red'}>
                  {selectedLog.action}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="User">
                <strong>{selectedLog.user}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Database">{selectedLog.database}</Descriptions.Item>
              <Descriptions.Item label="Table">{selectedLog.table}</Descriptions.Item>
              <Descriptions.Item label="Record Key">
                <span className="font-mono">{selectedLog.recordKey}</span>
              </Descriptions.Item>
              <Descriptions.Item label="IP Address">
                <span className="font-mono">{selectedLog.ipAddress || '192.168.1.104'}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Executed At" span={2}>
                {selectedLog.timestamp}
              </Descriptions.Item>
            </Descriptions>

            {selectedLog.querySql && (
              <div style={{ marginBottom: 20 }}>
                <Text strong style={{ fontSize: 13 }}>Executed SQL Query:</Text>
                <div style={{ marginTop: 6 }}>
                  <pre className="sql-preview font-mono">
                    <code>{selectedLog.querySql}</code>
                  </pre>
                </div>
              </div>
            )}

            {/* Before vs After Diff */}
            <div style={{ marginTop: 10 }}>
              <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
                Data State Changes (Before vs After):
              </Text>

              <Row gutter={12}>
                <Col span={12}>
                  <div
                    style={{
                      padding: '6px 10px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '6px 6px 0 0',
                      color: '#991b1b',
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    BEFORE
                  </div>
                  {selectedLog.beforeData ? (
                    <JsonViewer data={selectedLog.beforeData} maxHeight={260} />
                  ) : (
                    <div
                      style={{
                        padding: 20,
                        textAlign: 'center',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        color: '#94a3b8',
                        fontStyle: 'italic',
                      }}
                    >
                      None (New Record Created)
                    </div>
                  )}
                </Col>

                <Col span={12}>
                  <div
                    style={{
                      padding: '6px 10px',
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      borderRadius: '6px 6px 0 0',
                      color: '#065f46',
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    AFTER
                  </div>
                  {selectedLog.afterData ? (
                    <JsonViewer data={selectedLog.afterData} maxHeight={260} />
                  ) : (
                    <div
                      style={{
                        padding: 20,
                        textAlign: 'center',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        color: '#94a3b8',
                        fontStyle: 'italic',
                      }}
                    >
                      None (Record Deleted)
                    </div>
                  )}
                </Col>
              </Row>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
