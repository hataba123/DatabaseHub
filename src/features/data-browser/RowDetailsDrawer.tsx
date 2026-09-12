import React, { useEffect, useState } from 'react';
import {
  Drawer,
  Tabs,
  Descriptions,
  Button,
  Space,
  Tag,
  Modal,
  Typography,
  Spin,
  Empty,
  Collapse,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  HistoryOutlined,
  CodeOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { JsonViewer } from '@/components/common/JsonViewer';
import { DatabaseColumn, RowAuditHistoryItem } from '@/types/table';
import { crudApi } from '@/services/api/crudApi';

const { Text } = Typography;

interface RowDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  record: Record<string, any> | null;
  columns?: DatabaseColumn[];
  primaryKeys?: string[];
  tableName?: string;
  databaseId?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit: (record: Record<string, any>) => void;
  onDelete: (record: Record<string, any>) => void;
}

export const RowDetailsDrawer: React.FC<RowDetailsDrawerProps> = ({
  open,
  onClose,
  record,
  columns = [],
  primaryKeys = [],
  tableName = 'Table',
  databaseId = 'pmsc',
  canEdit = true,
  canDelete = true,
  onEdit,
  onDelete,
}) => {
  const [history, setHistory] = useState<RowAuditHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const effectivePkCols = primaryKeys.length > 0
    ? primaryKeys
    : columns.filter((c) => c.isPrimaryKey).map((c) => c.name);

  const primaryKeyValue = record
    ? effectivePkCols.map((pk) => `${record[pk]}`).join(';') || record.id || record.MaNhanVien || 'Record'
    : 'Record';

  // Fetch real audit history when drawer opens
  useEffect(() => {
    if (open && record && databaseId) {
      setLoadingHistory(true);
      const targetId = effectivePkCols.length > 0
        ? effectivePkCols.map((pk) => `${pk}=${record[pk]}`).join(';')
        : undefined;

      crudApi
        .getRowAuditHistory(databaseId, databaseId, 'dbo', tableName, targetId)
        .then((items) => {
          setHistory(items);
        })
        .catch(() => {
          setHistory([]);
        })
        .finally(() => {
          setLoadingHistory(false);
        });
    }
  }, [open, record, databaseId, tableName, effectivePkCols]);

  if (!record) return null;

  const confirmDelete = () => {
    Modal.confirm({
      title: 'Xác nhận xóa bản ghi?',
      icon: <ExclamationCircleOutlined style={{ color: '#ef4444' }} />,
      content: (
        <div>
          <p>
            Bạn chuẩn bị xóa bản ghi <Text strong>{primaryKeyValue}</Text> khỏi bảng{' '}
            <Text code>dbo.{tableName}</Text>.
          </p>
          <Text type="danger">Thao tác này không thể hoàn tác và sẽ được ghi vào nhật ký kiểm toán hệ thống.</Text>
        </div>
      ),
      okText: 'Xóa bản ghi',
      okType: 'danger',
      cancelText: 'Hủy bỏ',
      onOk: () => {
        onDelete(record);
        onClose();
      },
    });
  };

  // Render detail fields
  const displayColumns = columns.length > 0
    ? columns
    : Object.keys(record).map((k) => ({ name: k, dataType: typeof record[k], nullable: true, isPrimaryKey: false }));

  const tabItems = [
    {
      key: 'details',
      label: (
        <span>
          <FileTextOutlined /> Chi tiết
        </span>
      ),
      children: (
        <Descriptions
          bordered
          column={1}
          size="small"
          styles={{ label: { width: 160, fontWeight: 500, backgroundColor: '#f8fafc' } }}
        >
          {displayColumns.map((col) => {
            const val = record[col.name];
            const isPk = effectivePkCols.includes(col.name);

            return (
              <Descriptions.Item
                key={col.name}
                label={
                  <Space size={4}>
                    <span>{col.name}</span>
                    {isPk && (
                      <Tag color="gold" style={{ fontSize: 10, lineHeight: '14px', margin: 0 }}>
                        PK
                      </Tag>
                    )}
                  </Space>
                }
              >
                {renderValue(val, col)}
              </Descriptions.Item>
            );
          })}
        </Descriptions>
      ),
    },
    {
      key: 'history',
      label: (
        <span>
          <HistoryOutlined /> Lịch sử thay đổi ({history.length})
        </span>
      ),
      children: (
        <div>
          {loadingHistory ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Spin tip="Đang tải lịch sử kiểm toán..." />
            </div>
          ) : history.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {history.map((h) => (
                <div
                  key={h.id}
                  style={{
                    padding: 12,
                    background: '#f8fafc',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Space size={6}>
                      <Tag color={getActionColor(h.action)}>{h.action}</Tag>
                      <Text strong>{h.username}</Text>
                    </Space>
                    <Space size={4} style={{ fontSize: 12, color: '#94a3b8' }}>
                      <ClockCircleOutlined />
                      <span>{new Date(h.timestamp).toLocaleString('vi-VN')}</span>
                    </Space>
                  </div>
                  {h.diff && (
                    <Collapse
                      size="small"
                      ghost
                      items={[
                        {
                          key: 'diff',
                          label: <Text type="secondary" style={{ fontSize: 12 }}>Xem chi tiết Before / After</Text>,
                          children: <JsonViewer data={h.diff} maxHeight={200} />,
                        },
                      ]}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Chưa có nhật ký thay đổi nào được ghi nhận cho bản ghi này."
            />
          )}
        </div>
      ),
    },
    {
      key: 'raw',
      label: (
        <span>
          <CodeOutlined /> Dữ liệu JSON gốc
        </span>
      ),
      children: <JsonViewer data={record} maxHeight={420} />,
    },
  ];

  return (
    <Drawer
      title={
        <Space size={8}>
          <Text strong style={{ fontSize: 15 }}>
            Bản ghi:
          </Text>
          <Tag color="blue">{primaryKeyValue}</Tag>
        </Space>
      }
      width={560}
      open={open}
      onClose={onClose}
      extra={
        <Space>
          <Button
            icon={<EditOutlined />}
            disabled={!canEdit}
            onClick={() => {
              onEdit(record);
            }}
          >
            Chỉnh sửa
          </Button>
          <Button danger icon={<DeleteOutlined />} disabled={!canDelete} onClick={confirmDelete}>
            Xóa
          </Button>
        </Space>
      }
    >
      <Tabs defaultActiveKey="details" items={tabItems} />
    </Drawer>
  );
};

function renderValue(val: any, col: DatabaseColumn) {
  if (val === null || val === undefined) {
    return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>NULL</span>;
  }

  if (typeof val === 'boolean' || col.dataType.toLowerCase() === 'bit') {
    return (
      <Tag color={val ? 'green' : 'default'} style={{ margin: 0 }}>
        {val ? 'True (Có)' : 'False (Không)'}
      </Tag>
    );
  }

  if (col.isPrimaryKey) {
    return (
      <Text strong copyable className="font-mono" style={{ color: '#1677ff' }}>
        {String(val)}
      </Text>
    );
  }

  if (typeof val === 'object') {
    return <span className="font-mono text-xs">{JSON.stringify(val)}</span>;
  }

  return <span>{String(val)}</span>;
}

function getActionColor(action: string) {
  switch (action.toUpperCase()) {
    case 'ROW_INSERT':
    case 'INSERT':
      return 'green';
    case 'ROW_UPDATE':
    case 'UPDATE':
      return 'blue';
    case 'ROW_DELETE':
    case 'DELETE':
    case 'ROW_BULK_DELETE':
      return 'red';
    default:
      return 'purple';
  }
}
