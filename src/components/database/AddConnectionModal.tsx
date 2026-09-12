import React, { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Checkbox,
  Button,
  Space,
  Divider,
  message,
} from 'antd';
import { ApiOutlined, CheckCircleOutlined, SaveOutlined } from '@ant-design/icons';
import { databaseService } from '@/services/databaseService';
import { DatabaseConnection } from '@/types/database';

interface AddConnectionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (conn: DatabaseConnection) => void;
}

export const AddConnectionModal: React.FC<AddConnectionModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [authType, setAuthType] = useState('SQL Server Authentication');

  const handleTestConnection = async () => {
    try {
      const values = await form.validateFields(['serverHost', 'port', 'databaseName']);
      setTesting(true);
      const res = await databaseService.testConnection(values);
      setTesting(false);
      if (res.success) {
        message.success(`Connection successful! Latency: ${res.latencyMs}ms`);
      }
    } catch (err: any) {
      setTesting(false);
      message.error('Please verify server host, port, and database name');
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const saved = await databaseService.saveConnection(values);
      setSaving(false);
      message.success(`Database connection "${saved.name}" saved successfully`);
      form.resetFields();
      onSuccess(saved);
      onClose();
    } catch (err) {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
          <ApiOutlined style={{ color: '#1677ff' }} />
          <span>Add Database Connection</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      width={640}
      destroyOnClose
      footer={[
        <Button
          key="test"
          icon={<CheckCircleOutlined />}
          loading={testing}
          onClick={handleTestConnection}
          style={{ float: 'left' }}
        >
          Test Connection
        </Button>,
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="save"
          type="primary"
          icon={<SaveOutlined />}
          loading={saving}
          onClick={handleSave}
        >
          Save Connection
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          environment: 'Production',
          port: 1433,
          authType: 'SQL Server Authentication',
          encryptConnection: true,
          trustServerCertificate: true,
        }}
        style={{ marginTop: 16 }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <Form.Item
            name="name"
            label="Connection Name"
            rules={[{ required: true, message: 'Please input connection display name' }]}
          >
            <Input placeholder="e.g. PMSC Production DB" />
          </Form.Item>

          <Form.Item
            name="environment"
            label="Environment"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="Production">Production</Select.Option>
              <Select.Option value="Staging">Staging</Select.Option>
              <Select.Option value="Development">Development</Select.Option>
            </Select>
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 16 }}>
          <Form.Item
            name="serverHost"
            label="Server Host / Instance"
            rules={[{ required: true, message: 'Server host is required' }]}
          >
            <Input placeholder="e.g. 192.168.1.100 or DB-SRV-01" />
          </Form.Item>

          <Form.Item
            name="port"
            label="Port"
            rules={[{ required: true }]}
          >
            <InputNumber min={1} max={65535} style={{ width: '100%' }} />
          </Form.Item>
        </div>

        <Form.Item
          name="databaseName"
          label="Database Name"
          rules={[{ required: true, message: 'Database name is required' }]}
        >
          <Input placeholder="e.g. PMSC_PROD_DB" />
        </Form.Item>

        <Divider orientation="left" style={{ margin: '16px 0 12px 0', fontSize: 13, color: '#64748b' }}>
          Authentication
        </Divider>

        <Form.Item name="authType" label="Authentication Type">
          <Select onChange={(val) => setAuthType(val)}>
            <Select.Option value="SQL Server Authentication">SQL Server Authentication</Select.Option>
            <Select.Option value="Windows Authentication">Windows Authentication</Select.Option>
          </Select>
        </Form.Item>

        {authType === 'SQL Server Authentication' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="username"
              label="Username"
              rules={[{ required: true, message: 'Username is required' }]}
            >
              <Input placeholder="sa" />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Password is required' }]}
            >
              <Input.Password placeholder="••••••••••••" />
            </Form.Item>
          </div>
        )}

        <Divider orientation="left" style={{ margin: '12px 0 12px 0', fontSize: 13, color: '#64748b' }}>
          Security & TLS
        </Divider>

        <Space size={24}>
          <Form.Item name="encryptConnection" valuePropName="checked" style={{ margin: 0 }}>
            <Checkbox>Encrypt Connection (SSL/TLS)</Checkbox>
          </Form.Item>

          <Form.Item name="trustServerCertificate" valuePropName="checked" style={{ margin: 0 }}>
            <Checkbox>Trust Server Certificate</Checkbox>
          </Form.Item>
        </Space>
      </Form>
    </Modal>
  );
};
