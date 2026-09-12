import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  List,
  Checkbox,
  Tag,
  Button,
  Divider,
  Typography,
  Table,
  Space,
  message,
} from 'antd';
import {
  SafetyCertificateOutlined,
  SaveOutlined,
  DatabaseOutlined,
  TableOutlined,
} from '@ant-design/icons';
import { PageHeader } from '@/components/common/PageHeader';
import { userService } from '@/services/userService';
import { RoleDefinition } from '@/types/user';

const { Text, Title } = Typography;

export const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleDefinition | null>(null);
  const [loading, setLoading] = useState(true);

  // Table-level granular permissions state for demo
  const [tablePerms, setTablePerms] = useState({
    read: true,
    insert: true,
    update: true,
    delete: false,
    export: true,
  });

  useEffect(() => {
    userService.getRoles().then((res) => {
      setRoles(res);
      if (res.length > 0) setSelectedRole(res[2]); // Default to Data Editor
      setLoading(false);
    });
  }, []);

  const handleSavePermissions = () => {
    message.success(`Permissions for role "${selectedRole?.name}" saved successfully`);
  };

  const dbPermissionColumns = [
    {
      title: 'Database',
      dataIndex: 'database',
      key: 'database',
      render: (db: string) => (
        <Space>
          <DatabaseOutlined style={{ color: '#1677ff' }} />
          <strong>{db}</strong>
        </Space>
      ),
    },
    {
      title: 'Read',
      dataIndex: 'read',
      key: 'read',
      render: (checked: boolean) => <Checkbox defaultChecked={checked} />,
    },
    {
      title: 'Insert',
      dataIndex: 'insert',
      key: 'insert',
      render: (checked: boolean) => <Checkbox defaultChecked={checked} />,
    },
    {
      title: 'Update',
      dataIndex: 'update',
      key: 'update',
      render: (checked: boolean) => <Checkbox defaultChecked={checked} />,
    },
    {
      title: 'Delete',
      dataIndex: 'delete',
      key: 'delete',
      render: (checked: boolean) => <Checkbox defaultChecked={checked} />,
    },
    {
      title: 'Export',
      dataIndex: 'export',
      key: 'export',
      render: (checked: boolean) => <Checkbox defaultChecked={checked} />,
    },
  ];

  const dbMatrixData = [
    {
      key: 'pmsc',
      database: 'PMSC Production',
      read: true,
      insert: selectedRole?.name !== 'Data Viewer',
      update: selectedRole?.name !== 'Data Viewer',
      delete: ['Super Admin', 'Database Admin'].includes(selectedRole?.name || ''),
      export: true,
    },
    {
      key: 'hr',
      database: 'HR Database',
      read: true,
      insert: false,
      update: false,
      delete: false,
      export: true,
    },
    {
      key: 'weigh',
      database: 'Weigh Station',
      read: true,
      insert: ['Super Admin', 'Database Admin'].includes(selectedRole?.name || ''),
      update: ['Super Admin', 'Database Admin'].includes(selectedRole?.name || ''),
      delete: false,
      export: true,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Role & Access Control"
        subtitle="Configure role hierarchy and granular object permissions down to databases and individual tables."
        breadcrumbs={[{ title: 'Dashboard', path: '/dashboard' }, { title: 'Roles' }]}
        extra={
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSavePermissions}
          >
            Save Permissions
          </Button>
        }
      />

      <Row gutter={[16, 16]}>
        {/* Left: Role List */}
        <Col xs={24} md={8}>
          <Card
            title="System Roles"
            style={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
            styles={{ body: { padding: 0 } }}
          >
            <List
              dataSource={roles}
              renderItem={(role) => {
                const isSelected = selectedRole?.id === role.id;
                return (
                  <List.Item
                    onClick={() => setSelectedRole(role)}
                    style={{
                      padding: '14px 18px',
                      cursor: 'pointer',
                      borderLeft: isSelected ? '4px solid #1677ff' : '4px solid transparent',
                      backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong style={{ fontSize: 14, color: isSelected ? '#1677ff' : '#0f172a' }}>
                          {role.name}
                        </Text>
                        <Tag color="blue">{role.userCount} users</Tag>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                        {role.description}
                      </div>
                    </div>
                  </List.Item>
                );
              }}
            />
          </Card>
        </Col>

        {/* Right: Permission Matrix */}
        <Col xs={24} md={16}>
          <Card
            title={
              <Space>
                <SafetyCertificateOutlined style={{ color: '#1677ff' }} />
                <span>Permission Matrix: {selectedRole?.name}</span>
              </Space>
            }
            style={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
          >
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ fontSize: 14 }}>
                1. Database-Level Access
              </Text>
            </div>

            <Table
              dataSource={dbMatrixData}
              columns={dbPermissionColumns}
              pagination={false}
              size="middle"
              bordered
            />

            <Divider style={{ margin: '24px 0' }} />

            {/* Table Level Permissions */}
            <div style={{ marginBottom: 12 }}>
              <Text strong style={{ fontSize: 14 }}>
                2. Table-Level Granular Permissions (dbo.NhanVienDaiThanh)
              </Text>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                Overrides database defaults for sensitive tables.
              </div>
            </div>

            <Card size="small" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16,
                }}
              >
                <Space>
                  <TableOutlined style={{ color: '#10b981', fontSize: 18 }} />
                  <span className="font-mono" style={{ fontWeight: 600 }}>dbo.NhanVienDaiThanh</span>
                </Space>

                <Space size={20}>
                  <Checkbox
                    checked={tablePerms.read}
                    onChange={(e) => setTablePerms({ ...tablePerms, read: e.target.checked })}
                  >
                    Read
                  </Checkbox>
                  <Checkbox
                    checked={tablePerms.insert}
                    onChange={(e) => setTablePerms({ ...tablePerms, insert: e.target.checked })}
                  >
                    Insert
                  </Checkbox>
                  <Checkbox
                    checked={tablePerms.update}
                    onChange={(e) => setTablePerms({ ...tablePerms, update: e.target.checked })}
                  >
                    Update
                  </Checkbox>
                  <Checkbox
                    checked={tablePerms.delete}
                    onChange={(e) => setTablePerms({ ...tablePerms, delete: e.target.checked })}
                  >
                    Delete
                  </Checkbox>
                  <Checkbox
                    checked={tablePerms.export}
                    onChange={(e) => setTablePerms({ ...tablePerms, export: e.target.checked })}
                  >
                    Export
                  </Checkbox>
                </Space>
              </div>
            </Card>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
