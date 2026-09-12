import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Input,
  Space,
  Radio,
  Tag,
  Dropdown,
  Modal,
  message,
  Typography,
  Tabs,
  Badge,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  DownloadOutlined,
  UploadOutlined,
  ReloadOutlined,
  FilterOutlined,
  AppstoreOutlined,
  SearchOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  TableOutlined,
  InfoCircleOutlined,
  LayoutOutlined,
} from '@ant-design/icons';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable, TableDensity } from '@/components/data-table/DataTable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DatabaseTreeExplorer } from '@/components/database/DatabaseTreeExplorer';
import { FilterBuilderDrawer } from './FilterBuilderDrawer';
import { ColumnSelectorDrawer, ColumnItem } from './ColumnSelectorDrawer';
import { RowDetailsDrawer } from './RowDetailsDrawer';
import { DynamicRowModal } from './DynamicRowModal';
import { TableSchemaView } from './TableSchemaView';
import { tableService } from '@/services/tableService';
import { databaseService } from '@/services/databaseService';
import { FilterCondition, TableSchema, DatabaseObjectItem } from '@/types/table';
import { DatabaseConnection } from '@/types/database';

const { Text } = Typography;

export const TableDataBrowserPage: React.FC = () => {
  const { databaseId = 'pmsc', tableName = 'NhanVienDaiThanh' } = useParams<{
    databaseId: string;
    tableName: string;
  }>();
  const navigate = useNavigate();

  // State
  const [database, setDatabase] = useState<DatabaseConnection | null>(null);
  const [dbObjects, setDbObjects] = useState<DatabaseObjectItem[]>([]);
  const [schema, setSchema] = useState<TableSchema | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'data' | 'schema'>('data');
  const [showExplorer, setShowExplorer] = useState(true);

  // Query state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<string | undefined>('MaNhanVien');
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | null>('ascend');
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // Density & column customization
  const [density, setDensity] = useState<TableDensity>('normal');
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [columnDrawerOpen, setColumnDrawerOpen] = useState(false);

  // Row inspection & edit modals
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<any | null>(null);

  // Column definitions configuration
  const defaultColumns: ColumnItem[] = [
    { key: 'MaNhanVien', title: 'MaNhanVien', visible: true, required: true },
    { key: 'Name', title: 'Họ và Tên', visible: true },
    { key: 'Xuong', title: 'Xưởng', visible: true },
    { key: 'DeptName0', title: 'Phòng / Tổ', visible: true },
    { key: 'Status', title: 'Tình trạng', visible: true },
    { key: 'IsDisplay', title: 'Hiển thị', visible: true },
    { key: 'SalaryGrade', title: 'Bậc lương', visible: true },
    { key: 'BirthDate', title: 'Ngày sinh', visible: false },
    { key: 'Tel', title: 'Số ĐT', visible: false },
    { key: 'Address', title: 'Địa chỉ', visible: false },
    { key: 'JoinedDate', title: 'Ngày vào làm', visible: false },
  ];
  const [columnConfig, setColumnConfig] = useState<ColumnItem[]>(defaultColumns);

  // Fetch database info & explorer objects
  useEffect(() => {
    databaseService.getDatabase(databaseId).then(setDatabase);
    tableService.getDatabaseObjects(databaseId).then(setDbObjects);
    tableService.getTableSchema(databaseId, tableName).then(setSchema);
  }, [databaseId, tableName]);

  // Fetch Table Data
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await tableService.getTableData(databaseId, tableName, {
        page,
        pageSize,
        search,
        sortField,
        sortOrder,
        filters,
      });
      setData(res.data);
      setTotal(res.total);
    } catch (err) {
      message.error('Failed to load table data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [databaseId, tableName, page, pageSize, search, sortField, sortOrder, filters]);

  // Handlers
  const handleRefresh = () => {
    fetchData();
    message.success('Data refreshed');
  };

  const handleExport = () => {
    message.loading({ content: 'Exporting records to Excel...', key: 'export' });
    setTimeout(() => {
      message.success({ content: `Exported ${total} rows to CSV successfully!`, key: 'export' });
    }, 800);
  };

  const handleImport = () => {
    Modal.info({
      title: 'Import Records into dbo.' + tableName,
      content: 'Supports CSV, XLSX, and JSON file formats. (Demo Mode: upload backend mock)',
      okText: 'Understood',
    });
  };

  const handleRowClick = (record: any) => {
    setSelectedRecord(record);
    setDetailDrawerOpen(true);
  };

  const handleOpenEdit = (record: any) => {
    setRecordToEdit(record);
    setEditModalOpen(true);
  };

  const handleOpenCreate = () => {
    setRecordToEdit(null);
    setEditModalOpen(true);
  };

  const handleSaveRecord = async (values: any) => {
    if (recordToEdit) {
      await tableService.updateRow(databaseId, tableName, recordToEdit.MaNhanVien, values);
    } else {
      await tableService.createRow(databaseId, tableName, values);
    }
    fetchData();
    if (selectedRecord && selectedRecord.MaNhanVien === values.MaNhanVien) {
      setSelectedRecord(values);
    }
  };

  const handleDeleteRecord = async (key: string) => {
    await tableService.deleteRow(databaseId, tableName, key);
    fetchData();
  };

  // Build columns for DataTable
  const tableColumns = useMemo(() => {
    const cols: any[] = [];

    columnConfig.forEach((col) => {
      if (!col.visible) return;

      switch (col.key) {
        case 'MaNhanVien':
          cols.push({
            title: 'MaNhanVien',
            dataIndex: 'MaNhanVien',
            key: 'MaNhanVien',
            fixed: 'left' as const,
            width: 120,
            sorter: true,
            sortOrder: sortField === 'MaNhanVien' ? sortOrder : null,
            render: (text: string) => (
              <span className="font-mono" style={{ fontWeight: 600, color: '#1677ff' }}>
                {text}
              </span>
            ),
          });
          break;
        case 'Name':
          cols.push({
            title: 'Họ và Tên',
            dataIndex: 'Name',
            key: 'Name',
            width: 180,
            sorter: true,
            sortOrder: sortField === 'Name' ? sortOrder : null,
            render: (text: string) => <span style={{ fontWeight: 500 }}>{text}</span>,
          });
          break;
        case 'Xuong':
          cols.push({
            title: 'Xưởng',
            dataIndex: 'Xuong',
            key: 'Xuong',
            width: 90,
            align: 'center' as const,
            sorter: true,
            sortOrder: sortField === 'Xuong' ? sortOrder : null,
            render: (val: number) => <Tag color="blue">Xưởng {val}</Tag>,
          });
          break;
        case 'DeptName0':
          cols.push({
            title: 'Phòng / Tổ',
            dataIndex: 'DeptName0',
            key: 'DeptName0',
            width: 160,
          });
          break;
        case 'Status':
          cols.push({
            title: 'Tình trạng',
            dataIndex: 'Status',
            key: 'Status',
            width: 120,
            render: (status: string) => <StatusBadge status={status} size="small" />,
          });
          break;
        case 'IsDisplay':
          cols.push({
            title: 'Hiển thị',
            dataIndex: 'IsDisplay',
            key: 'IsDisplay',
            width: 100,
            align: 'center' as const,
            render: (val: boolean) => (
              <Tag color={val ? 'green' : 'default'} style={{ margin: 0 }}>
                {val ? 'Yes' : 'No'}
              </Tag>
            ),
          });
          break;
        case 'SalaryGrade':
          cols.push({
            title: 'Bậc lương',
            dataIndex: 'SalaryGrade',
            key: 'SalaryGrade',
            width: 100,
            align: 'center' as const,
            render: (val: string) => <Tag color="purple">{val || 'A1'}</Tag>,
          });
          break;
        case 'BirthDate':
        case 'Tel':
        case 'Address':
        case 'JoinedDate':
          cols.push({
            title: col.title,
            dataIndex: col.key,
            key: col.key,
            width: 140,
          });
          break;
      }
    });

    // Actions column
    cols.push({
      title: 'Actions',
      key: 'actions',
      fixed: 'right' as const,
      width: 70,
      align: 'center' as const,
      render: (_: any, record: any) => {
        const menuItems = [
          {
            key: 'view',
            icon: <EyeOutlined />,
            label: 'View Details',
            onClick: () => {
              setSelectedRecord(record);
              setDetailDrawerOpen(true);
            },
          },
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: 'Edit Row',
            onClick: () => handleOpenEdit(record),
          },
          { type: 'divider' as const },
          {
            key: 'delete',
            icon: <DeleteOutlined style={{ color: '#ef4444' }} />,
            label: <span style={{ color: '#ef4444' }}>Delete Row</span>,
            onClick: () => {
              Modal.confirm({
                title: 'Delete this record?',
                content: `Are you sure you want to delete ${record.MaNhanVien}?`,
                okType: 'danger',
                onOk: () => handleDeleteRecord(record.MaNhanVien),
              });
            },
          },
        ];

        return (
          <div onClick={(e) => e.stopPropagation()}>
            <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
              <Button type="text" size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </div>
        );
      },
    });

    return cols;
  }, [columnConfig, sortField, sortOrder]);

  return (
    <div>
      {/* Top Page Header */}
      <PageHeader
        title={tableName}
        subtitle={`dbo.${tableName} • SQL Server 2022 Table`}
        breadcrumbs={[
          { title: 'Databases', path: '/databases' },
          { title: database?.name || databaseId, path: `/databases/${databaseId}` },
          { title: 'Tables', path: `/databases/${databaseId}` },
          { title: tableName },
        ]}
        badge={<Tag color="blue" style={{ fontWeight: 600 }}>326,842 rows</Tag>}
        extra={
          <Space>
            <Button
              icon={<LayoutOutlined />}
              onClick={() => setShowExplorer(!showExplorer)}
            >
              {showExplorer ? 'Hide Explorer' : 'Show Explorer'}
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              Export
            </Button>
            <Button icon={<UploadOutlined />} onClick={handleImport}>
              Import
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenCreate}
            >
              Add Row
            </Button>
          </Space>
        }
      />

      {/* Main Container: Explorer on left + Main Content on right */}
      <div
        style={{
          display: 'flex',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          backgroundColor: '#ffffff',
          overflow: 'hidden',
          minHeight: 680,
        }}
      >
        {showExplorer && (
          <DatabaseTreeExplorer
            databaseId={databaseId}
            databaseName={database?.name || 'Database'}
            objects={dbObjects}
            currentTableName={tableName}
          />
        )}

        <div style={{ flex: 1, padding: 20, overflowX: 'auto', backgroundColor: '#ffffff' }}>
          {/* Top Tabs: Data vs Schema */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
              borderBottom: '1px solid #e2e8f0',
              paddingBottom: 8,
            }}
          >
            <Radio.Group
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="data">
                <Space size={6}>
                  <TableOutlined />
                  <span>Data ({total})</span>
                </Space>
              </Radio.Button>
              <Radio.Button value="schema">
                <Space size={6}>
                  <InfoCircleOutlined />
                  <span>Schema & Metadata</span>
                </Space>
              </Radio.Button>
            </Radio.Group>

            {activeTab === 'data' && (
              <Space size={12}>
                {/* Density Switcher */}
                <Radio.Group
                  size="small"
                  value={density}
                  onChange={(e) => setDensity(e.target.value)}
                  style={{ marginRight: 4 }}
                >
                  <Radio.Button value="compact">Compact</Radio.Button>
                  <Radio.Button value="normal">Normal</Radio.Button>
                  <Radio.Button value="comfortable">Comfortable</Radio.Button>
                </Radio.Group>

                {/* Column Visibility */}
                <Button
                  size="small"
                  icon={<AppstoreOutlined />}
                  onClick={() => setColumnDrawerOpen(true)}
                >
                  Columns
                </Button>

                {/* Filter Builder Button */}
                <Badge count={filters.length} offset={[-4, 4]}>
                  <Button
                    size="small"
                    type={filters.length > 0 ? 'primary' : 'default'}
                    icon={<FilterOutlined />}
                    onClick={() => setFilterDrawerOpen(true)}
                  >
                    Filter
                  </Button>
                </Badge>

                {/* Refresh */}
                <Tooltip title="Refresh Table">
                  <Button
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={handleRefresh}
                  />
                </Tooltip>
              </Space>
            )}
          </div>

          {/* Tab Content */}
          {activeTab === 'data' ? (
            <div>
              {/* Search Toolbar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 14,
                  gap: 12,
                }}
              >
                <Input
                  prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="Search table by MaNhanVien, Name, Dept..."
                  allowClear
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  style={{ maxWidth: 360, borderRadius: 6 }}
                />

                {/* Active filter tags */}
                {filters.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Active Filters:</Text>
                    {filters.map((f) => (
                      <Tag
                        key={f.id}
                        closable
                        onClose={() => setFilters(filters.filter((c) => c.id !== f.id))}
                        color="blue"
                      >
                        {f.field} {f.operator} {f.value ?? ''}
                      </Tag>
                    ))}
                    <Button type="link" size="small" onClick={() => setFilters([])} style={{ padding: 0 }}>
                      Clear all
                    </Button>
                  </div>
                )}
              </div>

              {/* Data Table */}
              <DataTable
                columns={tableColumns}
                dataSource={data}
                loading={loading}
                rowKey="MaNhanVien"
                density={density}
                scrollX={1100}
                onRowClick={handleRowClick}
                rowSelection={{
                  selectedRowKeys,
                  onChange: (keys) => setSelectedRowKeys(keys),
                }}
                pagination={{
                  current: page,
                  pageSize,
                  total,
                  onChange: (p, ps) => {
                    setPage(p);
                    setPageSize(ps);
                  },
                }}
              />
            </div>
          ) : (
            <div>
              {schema ? (
                <TableSchemaView schema={schema} />
              ) : (
                <div style={{ padding: 40, textAlign: 'center' }}>Loading schema...</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Drawers & Modals */}
      <FilterBuilderDrawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        conditions={filters}
        onApply={(newFilters) => {
          setFilters(newFilters);
          setPage(1);
        }}
      />

      <ColumnSelectorDrawer
        open={columnDrawerOpen}
        onClose={() => setColumnDrawerOpen(false)}
        columns={columnConfig}
        onChange={setColumnConfig}
        onReset={() => setColumnConfig(defaultColumns)}
      />

      <RowDetailsDrawer
        open={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        record={selectedRecord}
        onEdit={(rec) => {
          setDetailDrawerOpen(false);
          handleOpenEdit(rec);
        }}
        onDelete={handleDeleteRecord}
      />

      <DynamicRowModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        record={recordToEdit}
        onSave={handleSaveRecord}
      />
    </div>
  );
};
