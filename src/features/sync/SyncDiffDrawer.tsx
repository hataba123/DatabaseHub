import React from 'react';
import { Drawer, Tag, Typography, Table, Space, Alert, Badge, Row, Col, Card } from 'antd';
import {
  ArrowRightOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { SyncOperation } from '@/types/sync';

const { Text, Title } = Typography;

interface SyncDiffDrawerProps {
  open: boolean;
  operation: SyncOperation | null;
  onClose: () => void;
  targetDatabaseName?: string;
  sourceDatabaseName?: string;
}

export const SyncDiffDrawer: React.FC<SyncDiffDrawerProps> = ({
  open,
  operation,
  onClose,
  targetDatabaseName = 'Target DB',
  sourceDatabaseName = 'Source DB',
}) => {
  if (!operation) return null;

  const getActionTag = () => {
    switch (operation.operationType) {
      case 'Insert':
        return <Tag color="success">INSERT INTO TARGET</Tag>;
      case 'Update':
        return <Tag color="processing">UPDATE TARGET</Tag>;
      case 'Delete':
        return <Tag color="error">DELETE FROM TARGET</Tag>;
      case 'Blocked':
        return <Tag color="warning">BLOCKED</Tag>;
      default:
        return <Tag color="default">SKIP</Tag>;
    }
  };

  const getStatusBadge = () => {
    switch (operation.status) {
      case 'Success':
        return <Badge status="success" text="Executed Successfully" />;
      case 'Failed':
        return <Badge status="error" text="Execution Failed" />;
      case 'Conflict':
        return <Badge status="warning" text="Conflict Detected" />;
      case 'Blocked':
        return <Badge status="error" text="Blocked by Policy" />;
      default:
        return <Badge status="processing" text="Pending" />;
    }
  };

  // Build field comparison list
  const allKeys = Array.from(
    new Set([
      ...Object.keys(operation.sourceValues || {}),
      ...Object.keys(operation.targetValues || {}),
    ])
  );

  const diffRows = allKeys.map((key) => {
    const sourceVal = operation.sourceValues?.[key];
    const targetVal = operation.targetValues?.[key];
    const isChanged = operation.changedColumns?.includes(key) || sourceVal !== targetVal;
    const isPk = key.toLowerCase() === operation.primaryKey.toLowerCase() ||
      key.toLowerCase() === 'id' ||
      key.toLowerCase().endsWith('id');

    return {
      key,
      column: key,
      isPk,
      isChanged,
      sourceVal: sourceVal !== undefined ? JSON.stringify(sourceVal) : '—',
      targetVal: targetVal !== undefined ? JSON.stringify(targetVal) : '—',
    };
  });

  const columns = [
    {
      title: 'Column',
      dataIndex: 'column',
      key: 'column',
      width: 160,
      render: (col: string, row: any) => (
        <Space>
          <Text strong={row.isPk}>
            {col}
          </Text>
          {row.isPk && <Tag color="gold" style={{ fontSize: 10 }}>PK</Tag>}
          {row.isChanged && operation.operationType === 'Update' && (
            <Tag color="orange" style={{ fontSize: 10 }}>MODIFIED</Tag>
          )}
        </Space>
      ),
    },
    {
      title: (
        <span style={{ color: '#2563eb' }}>
          Source ({sourceDatabaseName})
        </span>
      ),
      dataIndex: 'sourceVal',
      key: 'sourceVal',
      render: (val: string, row: any) => {
        if (operation.operationType === 'Delete') {
          return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Missing (Deleted in source)</span>;
        }
        return (
          <div
            style={{
              padding: '2px 6px',
              borderRadius: 4,
              backgroundColor: row.isChanged && operation.operationType === 'Update' ? '#eff6ff' : 'transparent',
              fontWeight: row.isChanged ? 600 : 400,
              fontFamily: 'monospace',
            }}
          >
            {val}
          </div>
        );
      },
    },
    {
      title: (
        <span style={{ color: '#dc2626' }}>
          Target ({targetDatabaseName})
        </span>
      ),
      dataIndex: 'targetVal',
      key: 'targetVal',
      render: (val: string, row: any) => {
        if (operation.operationType === 'Insert') {
          return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Missing (Will be added)</span>;
        }
        return (
          <div
            style={{
              padding: '2px 6px',
              borderRadius: 4,
              backgroundColor: row.isChanged && operation.operationType === 'Update' ? '#fef2f2' : 'transparent',
              fontWeight: row.isChanged ? 600 : 400,
              fontFamily: 'monospace',
            }}
          >
            {val}
          </div>
        );
      },
    },
  ];

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>Operation Diff: {operation.schemaName}.{operation.tableName}</span>
          {getActionTag()}
        </div>
      }
      placement="right"
      width={720}
      onClose={onClose}
      open={open}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Error Alert if failed */}
        {operation.errorMessage && (
          <Alert
            type="error"
            showIcon
            message={operation.errorCode || 'Sync Error'}
            description={operation.errorMessage}
          />
        )}

        {/* Overview Details */}
        <Card size="small" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
          <Row gutter={[16, 8]}>
            <Col span={12}>
              <Text type="secondary">Table: </Text>
              <Text strong className="font-mono">{operation.schemaName}.{operation.tableName}</Text>
            </Col>
            <Col span={12}>
              <Text type="secondary">Primary Key: </Text>
              <Text strong className="font-mono">{operation.primaryKey}</Text>
            </Col>
            <Col span={12}>
              <Text type="secondary">Execution Order: </Text>
              <Text strong>#{operation.order}</Text>
            </Col>
            <Col span={12}>
              <Text type="secondary">Status: </Text>
              {getStatusBadge()}
            </Col>
            {operation.expectedTargetVersion && (
              <Col span={24}>
                <Text type="secondary">Concurrency Expected Version: </Text>
                <Text code>{operation.expectedTargetVersion}</Text>
              </Col>
            )}
            {operation.executedAt && (
              <Col span={24}>
                <Text type="secondary">Executed At: </Text>
                <Text>{new Date(operation.executedAt).toLocaleString()} ({operation.durationMs ?? 0}ms)</Text>
              </Col>
            )}
          </Row>
        </Card>

        {/* Action Explanation */}
        {operation.operationType === 'Insert' && (
          <Alert
            type="info"
            message="Insert Action"
            description={`Record exists in ${sourceDatabaseName} but does not exist in ${targetDatabaseName}. Executing this sync will insert a new row with the source values into the target table.`}
          />
        )}

        {operation.operationType === 'Update' && (
          <Alert
            type="warning"
            message="Update Action"
            description={`Record exists in both databases but has ${operation.changedColumns.length} modified column(s). Executing sync will update the target database record to match the source.`}
          />
        )}

        {operation.operationType === 'Delete' && (
          <Alert
            type="error"
            message="Delete Action (Permanent Removal)"
            description={`Record exists in ${targetDatabaseName} but does not exist in ${sourceDatabaseName}. Executing sync will permanently DELETE this row from the target database.`}
          />
        )}

        {/* Diff Table */}
        <div style={{ marginTop: 8 }}>
          <Title level={5} style={{ marginBottom: 12 }}>Field Comparison</Title>
          <Table
            dataSource={diffRows}
            columns={columns}
            pagination={false}
            size="small"
            bordered
            rowClassName={(record) => (record.isChanged ? 'highlight-diff-row' : '')}
          />
        </div>
      </Space>
    </Drawer>
  );
};
