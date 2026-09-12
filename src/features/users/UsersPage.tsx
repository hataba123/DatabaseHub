import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Tag,
  Avatar,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Drawer,
  Tabs,
  Descriptions,
  message,
} from 'antd';
import {
  PlusOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  EyeOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/data-table/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { userService } from '@/services/userService';
import { UserItem, SystemRole } from '@/types/user';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [form] = Form.useForm();

  const fetchUsers = async () => {
    setLoading(true);
    const data = await userService.getUsers();
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async () => {
    try {
      const values = await form.validateFields();
      const created = await userService.saveUser(values);
      message.success(`User ${created.username} created successfully`);
      form.resetFields();
      setAddModalOpen(false);
      fetchUsers();
    } catch (err) {
      // form error
    }
  };

  const columns = [
    {
      title: 'User',
      key: 'user',
      render: (_: any, record: UserItem) => (
        <Space>
          <Avatar style={{ backgroundColor: '#1677ff' }}>
            {record.fullName.substring(0, 1)}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, color: '#0f172a' }}>{record.fullName}</div>
            <div style={{ fontSize: 12, color: '#64748b' }} className="font-mono">
              @{record.username}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: SystemRole) => {
        let color = 'blue';
        if (role === 'Super Admin') color = 'red';
        if (role === 'Database Admin') color = 'purple';
        if (role === 'Data Editor') color = 'green';
        if (role === 'Auditor') color = 'orange';
        return <Tag color={color}>{role}</Tag>;
      },
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <StatusBadge status={status} />,
    },
    {
      title: 'Last Login',
      dataIndex: 'lastLogin',
      key: 'lastLogin',
      render: (date: string) => <span style={{ fontSize: 12, color: '#64748b' }}>{date}</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: UserItem) => (
        <Button
          size="small"
          type="link"
          icon={<EyeOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedUser(record);
          }}
        >
          View Profile
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Manage operators, database administrators, and user access permissions."
        breadcrumbs={[{ title: 'Dashboard', path: '/dashboard' }, { title: 'Users' }]}
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setAddModalOpen(true)}
          >
            Add User
          </Button>
        }
      />

      <DataTable
        columns={columns}
        dataSource={users}
        loading={loading}
        rowKey="id"
        onRowClick={(rec) => setSelectedUser(rec)}
      />

      {/* Add User Modal */}
      <Modal
        title="Add New User"
        open={addModalOpen}
        onCancel={() => setAddModalOpen(false)}
        onOk={handleCreateUser}
        okText="Create User"
      >
        <Form form={form} layout="vertical" initialValues={{ role: 'Data Viewer', status: 'Active' }}>
          <Form.Item name="username" label="Username" rules={[{ required: true }]}>
            <Input placeholder="e.g. nguyenvanb" />
          </Form.Item>
          <Form.Item name="fullName" label="Full Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Nguyễn Văn B" />
          </Form.Item>
          <Form.Item name="email" label="Email Address" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="e.g. b.nguyen@dbhub.enterprise" />
          </Form.Item>
          <Form.Item name="role" label="Role Assignment" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="Super Admin">Super Admin</Select.Option>
              <Select.Option value="Database Admin">Database Admin</Select.Option>
              <Select.Option value="Data Editor">Data Editor</Select.Option>
              <Select.Option value="Data Viewer">Data Viewer</Select.Option>
              <Select.Option value="Auditor">Auditor</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="department" label="Department">
            <Input placeholder="e.g. Ban Sản Xuất" />
          </Form.Item>
        </Form>
      </Modal>

      {/* User Detail Drawer */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserOutlined style={{ color: '#1677ff' }} />
            <span>User Details: {selectedUser?.fullName}</span>
          </div>
        }
        width={560}
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
      >
        {selectedUser && (
          <Tabs
            defaultActiveKey="profile"
            items={[
              {
                key: 'profile',
                label: 'Profile',
                children: (
                  <Descriptions bordered column={1} size="small">
                    <Descriptions.Item label="Full Name">{selectedUser.fullName}</Descriptions.Item>
                    <Descriptions.Item label="Username">@{selectedUser.username}</Descriptions.Item>
                    <Descriptions.Item label="Email">{selectedUser.email}</Descriptions.Item>
                    <Descriptions.Item label="Role">
                      <Tag color="blue">{selectedUser.role}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Department">{selectedUser.department}</Descriptions.Item>
                    <Descriptions.Item label="Status">
                      <StatusBadge status={selectedUser.status} />
                    </Descriptions.Item>
                    <Descriptions.Item label="Last Login">{selectedUser.lastLogin}</Descriptions.Item>
                  </Descriptions>
                ),
              },
              {
                key: 'permissions',
                label: 'Database Permissions',
                children: (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ padding: 12, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 600, color: '#1677ff' }}>PMSC Production</div>
                      <div style={{ marginTop: 6 }}>
                        <Tag color="success">Read</Tag>
                        {selectedUser.role !== 'Data Viewer' && <Tag color="success">Insert</Tag>}
                        {selectedUser.role !== 'Data Viewer' && <Tag color="success">Update</Tag>}
                        {['Super Admin', 'Database Admin'].includes(selectedUser.role) && <Tag color="success">Delete</Tag>}
                        <Tag color="success">Export</Tag>
                      </div>
                    </div>

                    <div style={{ padding: 12, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 600, color: '#1677ff' }}>HR Database</div>
                      <div style={{ marginTop: 6 }}>
                        <Tag color="success">Read</Tag>
                        <Tag color="success">Export</Tag>
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                key: 'activity',
                label: 'Recent Activity',
                children: (
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    User logged in from IP 192.168.1.104 at {selectedUser.lastLogin}.
                  </div>
                ),
              },
            ]}
          />
        )}
      </Drawer>
    </div>
  );
};
