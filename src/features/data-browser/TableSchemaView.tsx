import React from 'react';
import { Table, Tabs, Tag, Typography, Card } from 'antd';
import { TableSchema, DatabaseColumn, DatabaseIndex, DatabaseRelationship } from '@/types/table';
import { KeyOutlined, LinkOutlined, DatabaseOutlined, SafetyCertificateOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface TableSchemaViewProps {
  schema: TableSchema;
}

export const TableSchemaView: React.FC<TableSchemaViewProps> = ({ schema }) => {
  const columnColumns = [
    {
      title: 'Column',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, col: DatabaseColumn) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
          {col.isPrimaryKey && <KeyOutlined style={{ color: '#f59e0b' }} />}
          {col.isForeignKey && <LinkOutlined style={{ color: '#1677ff' }} />}
          <span className="font-mono">{text}</span>
        </span>
      ),
    },
    {
      title: 'Data Type',
      dataIndex: 'dataType',
      key: 'dataType',
      render: (dt: string) => <Tag color="blue" className="font-mono">{dt}</Tag>,
    },
    {
      title: 'Nullable',
      dataIndex: 'nullable',
      key: 'nullable',
      render: (nullable: boolean) => (
        <Tag color={nullable ? 'default' : 'orange'}>
          {nullable ? 'Yes' : 'No (NOT NULL)'}
        </Tag>
      ),
    },
    {
      title: 'Key',
      key: 'key',
      render: (_: any, col: DatabaseColumn) => {
        if (col.isPrimaryKey) return <Tag color="gold">PK</Tag>;
        if (col.isForeignKey) return <Tag color="cyan">FK</Tag>;
        return <span style={{ color: '#94a3b8' }}>-</span>;
      },
    },
    {
      title: 'Default',
      dataIndex: 'defaultValue',
      key: 'defaultValue',
      render: (val: string | null) => (val ? <code className="font-mono">{val}</code> : '-'),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (desc: string) => desc || '-',
    },
  ];

  const indexColumns = [
    {
      title: 'Index Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <span className="font-mono" style={{ fontWeight: 500 }}>{name}</span>,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'Clustered' ? 'purple' : 'default'}>{type}</Tag>
      ),
    },
    {
      title: 'Indexed Columns',
      dataIndex: 'columns',
      key: 'columns',
      render: (cols: string[]) => (
        <span>
          {cols.map((c) => (
            <Tag key={c} color="geekblue" className="font-mono">{c}</Tag>
          ))}
        </span>
      ),
    },
    {
      title: 'Is Unique',
      dataIndex: 'isUnique',
      key: 'isUnique',
      render: (unique: boolean) => (unique ? <Tag color="success">Unique</Tag> : 'No'),
    },
    {
      title: 'Size',
      dataIndex: 'sizeKb',
      key: 'sizeKb',
      render: (kb?: number) => (kb ? `${kb} KB` : '-'),
    },
  ];

  const relationColumns = [
    {
      title: 'Constraint Name',
      dataIndex: 'constraintName',
      key: 'constraintName',
      render: (name: string) => <span className="font-mono">{name}</span>,
    },
    {
      title: 'Local Column',
      dataIndex: 'column',
      key: 'column',
      render: (col: string) => <Tag color="blue" className="font-mono">{col}</Tag>,
    },
    {
      title: 'References',
      key: 'ref',
      render: (_: any, rel: DatabaseRelationship) => (
        <span className="font-mono" style={{ color: '#1677ff', fontWeight: 500 }}>
          {rel.foreignTable}.{rel.foreignColumn}
        </span>
      ),
    },
    {
      title: 'On Delete',
      dataIndex: 'onDelete',
      key: 'onDelete',
      render: (v: string) => v || 'NO ACTION',
    },
    {
      title: 'On Update',
      dataIndex: 'onUpdate',
      key: 'onUpdate',
      render: (v: string) => v || 'NO ACTION',
    },
  ];

  const permissionsMock = [
    { role: 'Super Admin', read: true, insert: true, update: true, delete: true, export: true },
    { role: 'Database Admin', read: true, insert: true, update: true, delete: true, export: true },
    { role: 'Data Editor', read: true, insert: true, update: true, delete: false, export: true },
    { role: 'Data Viewer', read: true, insert: false, update: false, delete: false, export: true },
    { role: 'Auditor', read: true, insert: false, update: false, delete: false, export: true },
  ];

  const permissionColumns = [
    { title: 'Role', dataIndex: 'role', key: 'role', render: (r: string) => <Text strong>{r}</Text> },
    { title: 'Read', dataIndex: 'read', key: 'read', render: (v: boolean) => (v ? <Tag color="success">Allow</Tag> : <Tag color="error">Deny</Tag>) },
    { title: 'Insert', dataIndex: 'insert', key: 'insert', render: (v: boolean) => (v ? <Tag color="success">Allow</Tag> : <Tag color="error">Deny</Tag>) },
    { title: 'Update', dataIndex: 'update', key: 'update', render: (v: boolean) => (v ? <Tag color="success">Allow</Tag> : <Tag color="error">Deny</Tag>) },
    { title: 'Delete', dataIndex: 'delete', key: 'delete', render: (v: boolean) => (v ? <Tag color="success">Allow</Tag> : <Tag color="error">Deny</Tag>) },
    { title: 'Export', dataIndex: 'export', key: 'export', render: (v: boolean) => (v ? <Tag color="success">Allow</Tag> : <Tag color="error">Deny</Tag>) },
  ];

  const items = [
    {
      key: 'columns',
      label: `Columns (${(schema.columns || []).length})`,
      children: (
        <Table
          size="small"
          dataSource={schema.columns || []}
          columns={columnColumns}
          pagination={false}
          rowKey="name"
          bordered
        />
      ),
    },
    {
      key: 'indexes',
      label: `Indexes (${(schema.indexes || []).length})`,
      children: (
        <Table
          size="small"
          dataSource={schema.indexes || []}
          columns={indexColumns}
          pagination={false}
          rowKey="name"
          bordered
        />
      ),
    },
    {
      key: 'relationships',
      label: `Relationships (${(schema.relationships || []).length})`,
      children: (
        <Table
          size="small"
          dataSource={schema.relationships || []}
          columns={relationColumns}
          pagination={false}
          rowKey="constraintName"
          bordered
        />
      ),
    },
    {
      key: 'permissions',
      label: 'Permissions',
      children: (
        <Table
          size="small"
          dataSource={permissionsMock}
          columns={permissionColumns}
          pagination={false}
          rowKey="role"
          bordered
        />
      ),
    },
  ];

  return (
    <Card
      style={{
        borderRadius: 8,
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
      }}
      styles={{ body: { padding: '12px 20px' } }}
    >
      <Tabs defaultActiveKey="columns" items={items} />
    </Card>
  );
};
