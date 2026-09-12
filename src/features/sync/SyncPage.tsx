import React, { useState } from 'react';
import {
  Steps,
  Card,
  Row,
  Col,
  Select,
  Button,
  Table,
  Tag,
  Alert,
  Modal,
  Checkbox,
  Space,
  Typography,
  Result,
  Progress,
  message,
} from 'antd';
import {
  SwapOutlined,
  CheckCircleOutlined,
  CodeOutlined,
  WarningOutlined,
  ArrowRightOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { PageHeader } from '@/components/common/PageHeader';

const { Text, Title } = Typography;

interface SyncChangeItem {
  id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  primaryKey: string;
  details: string;
  selected: boolean;
}

export const SyncPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [sourceDb, setSourceDb] = useState('pmsc');
  const [targetDb, setTargetDb] = useState('pmsc-backup');
  const [syncing, setSyncing] = useState(false);
  const [previewSqlOpen, setPreviewSqlOpen] = useState(false);

  const [changes, setChanges] = useState<SyncChangeItem[]>([
    { id: '1', action: 'INSERT', table: 'NhanVienDaiThanh', primaryKey: 'AD38877', details: 'Lê Thành Ký (Xưởng 2)', selected: true },
    { id: '2', action: 'INSERT', table: 'NhanVienDaiThanh', primaryKey: 'AD39005', details: 'Trần Văn Cảnh (Xưởng 3)', selected: true },
    { id: '3', action: 'INSERT', table: 'HQ_PhieuCan', primaryKey: 'PC-99420', details: 'Gross 24.5t, Net 16.3t', selected: true },
    { id: '4', action: 'UPDATE', table: 'HQ_Size', primaryKey: '25X25', details: 'IsActive: 0 -> 1', selected: true },
    { id: '5', action: 'UPDATE', table: 'NhanVienDaiThanh', primaryKey: 'AD39001', details: 'DeptName0: Tổ Hàn Cắt 2 -> Tổ Cơ Khí 1', selected: true },
  ]);

  const insertCount = changes.filter((c) => c.action === 'INSERT' && c.selected).length;
  const updateCount = changes.filter((c) => c.action === 'UPDATE' && c.selected).length;
  const deleteCount = changes.filter((c) => c.action === 'DELETE' && c.selected).length;

  const toggleChangeSelection = (id: string) => {
    setChanges(
      changes.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  };

  const handleExecuteSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setCurrentStep(4);
      message.success('Synchronization completed successfully!');
    }, 1500);
  };

  const generatedSql = `-- =============================================
-- DBHub Auto-Generated Sync Script
-- Source: PMSC_PROD_DB -> Target: PMSC_STANDBY_REPLICA
-- Generated at: ${new Date().toISOString()}
-- =============================================

BEGIN TRANSACTION;
BEGIN TRY

-- 1. INSERT RECORDS INTO dbo.NhanVienDaiThanh
INSERT INTO dbo.NhanVienDaiThanh (MaNhanVien, Name, Xuong, DeptName0, Status)
VALUES ('AD38877', N'Lê Thành Ký', 2, N'Nhóm SC14-AD', N'Đang Làm');

INSERT INTO dbo.NhanVienDaiThanh (MaNhanVien, Name, Xuong, DeptName0, Status)
VALUES ('AD39005', N'Trần Văn Cảnh', 3, N'Phòng KCS / QC', N'Đang Làm');

-- 2. UPDATE RECORD IN dbo.HQ_Size
UPDATE dbo.HQ_Size
SET IsActive = 1
WHERE SizeCode = '25X25';

-- 3. UPDATE RECORD IN dbo.NhanVienDaiThanh
UPDATE dbo.NhanVienDaiThanh
SET DeptName0 = N'Tổ Cơ Khí 1'
WHERE MaNhanVien = 'AD39001';

COMMIT TRANSACTION;
PRINT 'Sync completed successfully.';
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    THROW;
END CATCH;`;

  const steps = [
    { title: 'Select Databases' },
    { title: 'Compare' },
    { title: 'Review Changes' },
    { title: 'Confirm' },
    { title: 'Result' },
  ];

  const columns = [
    {
      title: 'Sync',
      dataIndex: 'selected',
      key: 'selected',
      width: 60,
      render: (selected: boolean, record: SyncChangeItem) => (
        <Checkbox
          checked={selected}
          onChange={() => toggleChangeSelection(record.id)}
        />
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action: string) => {
        if (action === 'INSERT') return <Tag color="green">INSERT</Tag>;
        if (action === 'UPDATE') return <Tag color="blue">UPDATE</Tag>;
        return <Tag color="red">DELETE</Tag>;
      },
    },
    {
      title: 'Target Table',
      dataIndex: 'table',
      key: 'table',
      render: (text: string) => <span className="font-mono">{text}</span>,
    },
    {
      title: 'Primary Key',
      dataIndex: 'primaryKey',
      key: 'primaryKey',
      render: (pk: string) => <span className="font-mono" style={{ fontWeight: 600 }}>{pk}</span>,
    },
    {
      title: 'Change Description',
      dataIndex: 'details',
      key: 'details',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Database Sync"
        subtitle="Multi-step wizard to safely synchronize data and schema differences between environments."
        breadcrumbs={[{ title: 'Dashboard', path: '/dashboard' }, { title: 'Sync' }]}
      />

      {/* Steps Indicator */}
      <Card style={{ marginBottom: 20, borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <Steps current={currentStep} items={steps} />
      </Card>

      {/* Step 0: Select Databases */}
      {currentStep === 0 && (
        <Card title="Step 1: Select Source and Target Databases" style={{ borderRadius: 8 }}>
          <Row gutter={[24, 16]}>
            <Col xs={24} md={12}>
              <Text strong>Source Database (Source of Truth)</Text>
              <Select
                value={sourceDb}
                onChange={setSourceDb}
                style={{ width: '100%', marginTop: 8 }}
                options={[
                  { label: 'PMSC Production (DB-SRV-01)', value: 'pmsc' },
                  { label: 'HR Database (DB-SRV-02)', value: 'hr' },
                ]}
              />
            </Col>
            <Col xs={24} md={12}>
              <Text strong>Target Database (Will Receive Changes)</Text>
              <Select
                value={targetDb}
                onChange={setTargetDb}
                style={{ width: '100%', marginTop: 8 }}
                options={[
                  { label: 'PMSC Backup (DB-SRV-04)', value: 'pmsc-backup' },
                  { label: 'Testing Database (DB-SRV-DEV)', value: 'testing-db' },
                ]}
              />
            </Col>
          </Row>

          <div style={{ marginTop: 24, textAlign: 'right' }}>
            <Button type="primary" onClick={() => setCurrentStep(1)}>
              Next: Compare Databases <ArrowRightOutlined />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 1: Compare */}
      {currentStep === 1 && (
        <Card title="Step 2: Compare Analysis" style={{ borderRadius: 8 }}>
          <Alert
            type="info"
            showIcon
            message="Comparison Completed"
            description="Found 5 differences across 3 tables between PMSC Production and PMSC Backup."
            style={{ marginBottom: 20 }}
          />

          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col span={8}>
              <Card size="small" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                <Text type="secondary">Records to INSERT</Text>
                <Title level={3} style={{ margin: '4px 0 0 0', color: '#16a34a' }}>3 rows</Title>
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
                <Text type="secondary">Records to UPDATE</Text>
                <Title level={3} style={{ margin: '4px 0 0 0', color: '#2563eb' }}>2 rows</Title>
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
                <Text type="secondary">Records to DELETE</Text>
                <Title level={3} style={{ margin: '4px 0 0 0', color: '#dc2626' }}>0 rows</Title>
              </Card>
            </Col>
          </Row>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => setCurrentStep(0)}>Back</Button>
            <Button type="primary" onClick={() => setCurrentStep(2)}>
              Next: Review Changes ({changes.length}) <ArrowRightOutlined />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Review Changes */}
      {currentStep === 2 && (
        <Card title="Step 3: Review Changes" style={{ borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Space>
              <Tag color="green">INSERT: {insertCount} rows</Tag>
              <Tag color="blue">UPDATE: {updateCount} rows</Tag>
              <Tag color="red">DELETE: {deleteCount} rows</Tag>
            </Space>
            <Button icon={<CodeOutlined />} onClick={() => setPreviewSqlOpen(true)}>
              Preview SQL
            </Button>
          </div>

          <Table
            dataSource={changes}
            columns={columns}
            rowKey="id"
            pagination={false}
            size="middle"
          />

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => setCurrentStep(1)}>Back</Button>
            <Button type="primary" onClick={() => setCurrentStep(3)}>
              Next: Confirm & Execute <ArrowRightOutlined />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Confirm */}
      {currentStep === 3 && (
        <Card title="Step 4: Confirm Synchronization Execution" style={{ borderRadius: 8 }}>
          <Alert
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            message="Caution: Changes will be applied to PMSC Backup."
            description="Review all changes before continuing. Once executed, the transaction will be committed to the target database."
            style={{ marginBottom: 20 }}
          />

          <div style={{ padding: 16, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', marginBottom: 20 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Execution Summary:</div>
            <div>• Target Server: <span className="font-mono">DB-SRV-04</span></div>
            <div>• Target Database: <span className="font-mono">PMSC_STANDBY_REPLICA</span></div>
            <div>• Total Operations: <strong>{insertCount + updateCount} records</strong></div>
            <div>• Transaction Isolation: <strong>READ COMMITTED with Automatic Rollback on Error</strong></div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => setCurrentStep(2)}>Back to Review</Button>
            <Space>
              <Button icon={<CodeOutlined />} onClick={() => setPreviewSqlOpen(true)}>
                Preview SQL
              </Button>
              <Button
                type="primary"
                danger
                icon={<SyncOutlined />}
                loading={syncing}
                onClick={handleExecuteSync}
              >
                Execute Sync Now
              </Button>
            </Space>
          </div>
        </Card>
      )}

      {/* Step 4: Result */}
      {currentStep === 4 && (
        <Card style={{ borderRadius: 8 }}>
          <Result
            status="success"
            title="Synchronization Completed Successfully"
            subTitle="All 5 records have been successfully applied to PMSC Backup (DB-SRV-04). Transaction committed in 420ms."
            extra={[
              <Button type="primary" key="dashboard" onClick={() => setCurrentStep(0)}>
                Start Another Sync
              </Button>,
              <Button key="audit" onClick={() => (window.location.href = '/audit-logs')}>
                View in Audit Logs
              </Button>,
            ]}
          />
        </Card>
      )}

      {/* Preview SQL Modal */}
      <Modal
        title="Preview SQL Synchronization Script"
        open={previewSqlOpen}
        onCancel={() => setPreviewSqlOpen(false)}
        width={700}
        footer={[
          <Button key="close" type="primary" onClick={() => setPreviewSqlOpen(false)}>
            Close
          </Button>,
        ]}
      >
        <pre className="sql-preview font-mono">
          <code>{generatedSql}</code>
        </pre>
      </Modal>
    </div>
  );
};
