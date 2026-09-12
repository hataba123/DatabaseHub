import React, { useState } from 'react';
import {
  Card,
  Tabs,
  Form,
  Input,
  Switch,
  Button,
  Table,
  Tag,
  Space,
  Typography,
  Divider,
  message,
} from 'antd';
import {
  SettingOutlined,
  ApiOutlined,
  BgColorsOutlined,
  SafetyCertificateOutlined,
  HistoryOutlined,
  BellOutlined,
  ThunderboltOutlined,
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { mockDatabases } from '@/mocks/databases.mock';

const { Text } = Typography;

export const SettingsPage: React.FC = () => {
  const [activeKey, setActiveKey] = useState('connections');

  const connectionColumns = [
    {
      title: 'Connection Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <strong>{name}</strong>,
    },
    {
      title: 'Server Host',
      dataIndex: 'serverHost',
      key: 'serverHost',
      render: (host: string) => <span className="font-mono">{host}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <StatusBadge status={status} />,
    },
    {
      title: 'Environment',
      dataIndex: 'environment',
      key: 'environment',
      render: (env: string) => <Tag color="blue">{env}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space>
          <Button
            size="small"
            icon={<ThunderboltOutlined />}
            onClick={() => message.success(`Connection to ${record.name} verified: 14ms`)}
          >
            Test
          </Button>
          <Button size="small" icon={<EditOutlined />}>
            Edit
          </Button>
          <Button size="small" danger icon={<DeleteOutlined />}>
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'connections',
      label: (
        <span>
          <ApiOutlined /> Connections
        </span>
      ),
      children: (
        <Card title="Configured Database Connections" style={{ borderRadius: 8 }}>
          <Table
            dataSource={mockDatabases}
            columns={connectionColumns}
            rowKey="id"
            pagination={false}
            size="middle"
          />
        </Card>
      ),
    },
    {
      key: 'general',
      label: (
        <span>
          <SettingOutlined /> General
        </span>
      ),
      children: (
        <Card title="Platform Configuration" style={{ borderRadius: 8 }}>
          <Form layout="vertical" style={{ maxWidth: 500 }}>
            <Form.Item label="Platform Title" initialValue="DBHub – Enterprise Database Management">
              <Input />
            </Form.Item>
            <Form.Item label="Default Page Size" initialValue="25">
              <Input />
            </Form.Item>
            <Form.Item label="Session Timeout (Minutes)" initialValue="60">
              <Input />
            </Form.Item>
            <Button type="primary" onClick={() => message.success('General settings saved.')}>
              Save Settings
            </Button>
          </Form>
        </Card>
      ),
    },
    {
      key: 'appearance',
      label: (
        <span>
          <BgColorsOutlined /> Appearance
        </span>
      ),
      children: (
        <Card title="Appearance & Themes" style={{ borderRadius: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 500 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Compact Density by Default</Text>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Reduces table row height and padding across data grids.
                </div>
              </div>
              <Switch defaultChecked={false} />
            </div>

            <Divider style={{ margin: 0 }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Dark Mode (Beta Preview)</Text>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Enable dark theme tokens for low-light enterprise environments.
                </div>
              </div>
              <Switch defaultChecked={false} onChange={() => message.info('Dark Mode is queued for next release!')} />
            </div>
          </div>
        </Card>
      ),
    },
    {
      key: 'security',
      label: (
        <span>
          <SafetyCertificateOutlined /> Security
        </span>
      ),
      children: (
        <Card title="Security & Authentication Policies" style={{ borderRadius: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 500 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Enforce TLS Encryption</Text>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Require encrypted SQL Server connections.
                </div>
              </div>
              <Switch defaultChecked={true} />
            </div>

            <Divider style={{ margin: 0 }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Audit Every Query Execution</Text>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Log raw SQL statements into persistent audit log store.
                </div>
              </div>
              <Switch defaultChecked={true} />
            </div>
          </div>
        </Card>
      ),
    },
    {
      key: 'notifications',
      label: (
        <span>
          <BellOutlined /> Notifications
        </span>
      ),
      children: (
        <Card title="Alert Channels" style={{ borderRadius: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 500 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Slow Query Alerts</Text>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Notify DBA when queries exceed 3,000ms.
                </div>
              </div>
              <Switch defaultChecked={true} />
            </div>

            <Divider style={{ margin: 0 }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Text strong>Storage Capacity Warning (80%)</Text>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  Send immediate warning when database reaches storage quota.
                </div>
              </div>
              <Switch defaultChecked={true} />
            </div>
          </div>
        </Card>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Manage database connections, security parameters, system preferences, and alert policies."
        breadcrumbs={[{ title: 'Dashboard', path: '/dashboard' }, { title: 'Settings' }]}
      />

      <Tabs
        tabPosition="left"
        activeKey={activeKey}
        onChange={setActiveKey}
        items={tabItems}
        style={{ minHeight: 450 }}
      />
    </div>
  );
};
