import React from 'react';
import {
  Drawer,
  Tabs,
  Descriptions,
  Button,
  Space,
  Tag,
  Modal,
  Typography,
  message,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  HistoryOutlined,
  CodeOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { JsonViewer } from '@/components/common/JsonViewer';
import { StatusBadge } from '@/components/common/StatusBadge';

const { Text } = Typography;

interface RowDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  record: Record<string, any> | null;
  onEdit: (record: Record<string, any>) => void;
  onDelete: (recordKey: string) => void;
}

export const RowDetailsDrawer: React.FC<RowDetailsDrawerProps> = ({
  open,
  onClose,
  record,
  onEdit,
  onDelete,
}) => {
  if (!record) return null;

  const primaryKey = record.MaNhanVien || record.Id || 'Record';

  const confirmDelete = () => {
    Modal.confirm({
      title: 'Delete this record?',
      icon: <ExclamationCircleOutlined style={{ color: '#ef4444' }} />,
      content: (
        <div>
          <p>
            You are about to delete record <Text strong>{primaryKey}</Text> from table{' '}
            <Text code>dbo.NhanVienDaiThanh</Text>.
          </p>
          <Text type="danger">This action cannot be undone and will be recorded in audit logs.</Text>
        </div>
      ),
      okText: 'Delete Record',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        onDelete(primaryKey);
        onClose();
        message.success(`Record ${primaryKey} deleted successfully`);
      },
    });
  };

  const tabItems = [
    {
      key: 'details',
      label: (
        <span>
          <FileTextOutlined /> Details
        </span>
      ),
      children: (
        <Descriptions
          bordered
          column={1}
          size="small"
          styles={{ label: { width: 140, fontWeight: 500, backgroundColor: '#f8fafc' } }}
        >
          <Descriptions.Item label="MaNhanVien">
            <Text strong copyable className="font-mono" style={{ color: '#1677ff' }}>
              {record.MaNhanVien}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="Name">{record.Name}</Descriptions.Item>
          <Descriptions.Item label="Xuong">
            <Tag color="blue">Xưởng {record.Xuong}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="DeptName0">{record.DeptName0}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <StatusBadge status={record.Status} />
          </Descriptions.Item>
          <Descriptions.Item label="IsDisplay">
            <Tag color={record.IsDisplay ? 'success' : 'default'}>
              {record.IsDisplay ? 'Yes (True)' : 'No (False)'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="BirthDate">{record.BirthDate || '-'}</Descriptions.Item>
          <Descriptions.Item label="Tel">
            <Text copyable>{record.Tel || '-'}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Address">{record.Address || '-'}</Descriptions.Item>
          <Descriptions.Item label="SalaryGrade">{record.SalaryGrade || 'A1'}</Descriptions.Item>
          <Descriptions.Item label="JoinedDate">{record.JoinedDate || '-'}</Descriptions.Item>
        </Descriptions>
      ),
    },
    {
      key: 'history',
      label: (
        <span>
          <HistoryOutlined /> Change History
        </span>
      ),
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{
              padding: 12,
              background: '#f8fafc',
              borderRadius: 6,
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Tag color="blue">UPDATE</Tag>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>2024-05-21 14:30:15</span>
            </div>
            <div style={{ fontSize: 12, color: '#334155' }}>
              User <Text strong>loi</Text> updated field <Text code>Name</Text> via DBHub Web UI.
            </div>
          </div>
          <div
            style={{
              padding: 12,
              background: '#f8fafc',
              borderRadius: 6,
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Tag color="green">INSERT</Tag>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>2023-10-15 08:20:00</span>
            </div>
            <div style={{ fontSize: 12, color: '#334155' }}>
              Record initialized by HR Data Import batch job.
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'raw',
      label: (
        <span>
          <CodeOutlined /> Raw Data (JSON)
        </span>
      ),
      children: <JsonViewer data={record} maxHeight={420} />,
    },
  ];

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text strong style={{ fontSize: 15 }}>
            Record Details: {primaryKey}
          </Text>
        </div>
      }
      width={540}
      open={open}
      onClose={onClose}
      extra={
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => {
              onEdit(record);
            }}
          >
            Edit
          </Button>
          <Button danger icon={<DeleteOutlined />} onClick={confirmDelete}>
            Delete
          </Button>
        </Space>
      }
    >
      <Tabs defaultActiveKey="details" items={tabItems} />
    </Drawer>
  );
};
