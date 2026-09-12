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
  ExclamationCircleOutlined,
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
import { databaseService } from './../../services/databaseService';
import { FilterCondition, TableSchema, DatabaseObjectItem, TableCapabilities } from '@/types/table';
import { DatabaseConnection } from '@/types/database';
import { useTranslation } from '@/locales';
import { useAuthStore } from '@/stores/useAuthStore';
import { PERMISSIONS } from '@/types/auth';

const { Text } = Typography;

export const TableDataBrowserPage: React.FC = () => {
  const { databaseId = 'pmsc', tableName = 'NhanVienDaiThanh' } = useParams<{
    databaseId: string;
    tableName: string;
  }>();
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const { hasPermission } = useAuthStore();

  const [capabilities, setCapabilities] = useState<TableCapabilities | null>(null);

  const canInsert = (capabilities?.canInsert ?? true) && hasPermission(PERMISSIONS.DATABASE_INSERT, { connectionId: databaseId, table: tableName });
  const canUpdate = (capabilities?.canUpdate ?? true) && hasPermission(PERMISSIONS.DATABASE_UPDATE, { connectionId: databaseId, table: tableName });
  const canDelete = (capabilities?.canDelete ?? true) && hasPermission(PERMISSIONS.DATABASE_DELETE, { connectionId: databaseId, table: tableName });
  const canExport = hasPermission(PERMISSIONS.DATABASE_EXPORT, { connectionId: databaseId, table: tableName });

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
    { key: 'Name', title: language === 'vi' ? 'Họ và Tên' : 'Full Name', visible: true },
    { key: 'Xuong', title: language === 'vi' ? 'Xưởng' : 'Workshop', visible: true },
    { key: 'DeptName0', title: language === 'vi' ? 'Phòng / Tổ' : 'Department', visible: true },
    { key: 'Status', title: language === 'vi' ? 'Tình trạng' : 'Status', visible: true },
    { key: 'IsDisplay', title: language === 'vi' ? 'Hiển thị' : 'Display', visible: true },
    { key: 'SalaryGrade', title: language === 'vi' ? 'Bậc lương' : 'Salary Grade', visible: true },
    { key: 'BirthDate', title: language === 'vi' ? 'Ngày sinh' : 'Birth Date', visible: false },
    { key: 'Tel', title: language === 'vi' ? 'Số ĐT' : 'Phone', visible: false },
    { key: 'Address', title: language === 'vi' ? 'Địa chỉ' : 'Address', visible: false },
    { key: 'JoinedDate', title: language === 'vi' ? 'Ngày vào làm' : 'Joined Date', visible: false },
  ];
  const [columnConfig, setColumnConfig] = useState<ColumnItem[]>(defaultColumns);

  const primaryKeyCols = useMemo(() => {
    if (capabilities?.primaryKeys && capabilities.primaryKeys.length > 0) {
      return capabilities.primaryKeys;
    }
    const schemaPks = schema?.columns?.filter((c) => c.isPrimaryKey).map((c) => c.name);
    if (schemaPks && schemaPks.length > 0) return schemaPks;
    return ['MaNhanVien'];
  }, [capabilities, schema]);

  const primaryKeyCol = primaryKeyCols[0] || 'MaNhanVien';

  const extractKeys = (rec: any) => {
    const keys: Record<string, any> = {};
    primaryKeyCols.forEach((pk) => {
      if (rec && rec[pk] !== undefined) {
        keys[pk] = rec[pk];
      }
    });
    if (Object.keys(keys).length === 0 && rec) {
      keys[primaryKeyCol] = rec[primaryKeyCol] ?? rec.id ?? rec.MaNhanVien;
    }
    return keys;
  };

  // Fetch database info & explorer objects
  useEffect(() => {
    databaseService.getDatabase(databaseId).then(setDatabase);
    tableService.getDatabaseObjects(databaseId).then(setDbObjects);
    tableService.getTableCapabilities(databaseId, tableName).then(setCapabilities);
    tableService.getTableSchema(databaseId, tableName).then((s) => {
      setSchema(s);
      if (tableName === 'NhanVienDaiThanh') {
        setColumnConfig(defaultColumns);
        setSortField('MaNhanVien');
      } else if (s && s.columns && s.columns.length > 0) {
        const pk = s.columns.find((c) => c.isPrimaryKey);
        const dynamicCols: ColumnItem[] = s.columns.map((c, idx) => ({
          key: c.name,
          title: c.name,
          visible: idx < 8,
          required: c.isPrimaryKey,
        }));
        setColumnConfig(dynamicCols);
        setSortField(pk?.name || s.columns[0].name);
      }
    });
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
      message.error(language === 'vi' ? 'Không thể tải dữ liệu bảng' : 'Failed to load table data');
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
    message.success(language === 'vi' ? 'Đã làm mới dữ liệu' : 'Data refreshed');
  };

  const handleTableChange = (_pag: any, _filt: any, sorter: any) => {
    if (sorter && sorter.field) {
      setSortField(String(sorter.field));
      setSortOrder(sorter.order || null);
    } else {
      setSortField(undefined);
      setSortOrder(null);
    }
  };

  const handleExport = () => {
    message.loading({ content: language === 'vi' ? 'Đang xuất file Excel...' : 'Exporting records to Excel...', key: 'export' });
    setTimeout(() => {
      message.success({
        content: language === 'vi' ? `Đã xuất ${total} dòng ra file CSV thành công!` : `Exported ${total} rows to CSV successfully!`,
        key: 'export',
      });
    }, 800);
  };

  const handleImport = () => {
    Modal.info({
      title: language === 'vi' ? `Nhập dữ liệu vào bảng dbo.${tableName}` : `Import Records into dbo.${tableName}`,
      content: language === 'vi' ? 'Hỗ trợ định dạng CSV, XLSX và JSON. (Chế độ demo: mock backend upload)' : 'Supports CSV, XLSX, and JSON file formats. (Demo Mode: upload backend mock)',
      okText: language === 'vi' ? 'Đã hiểu' : 'Understood',
    });
  };

  const handleRowClick = (record: any) => {
    setSelectedRecord(record);
    setDetailDrawerOpen(true);
  };

  const handleOpenEdit = (record: any) => {
    if (!canUpdate) {
      message.warning(
        language === 'vi'
          ? 'Bạn không có quyền chỉnh sửa dữ liệu trong bảng này.'
          : 'You do not have permission to update data in this table.'
      );
      return;
    }
    setRecordToEdit(record);
    setEditModalOpen(true);
  };

  const handleOpenCreate = () => {
    if (!canInsert) {
      message.warning(
        language === 'vi'
          ? 'Bạn không có quyền thêm dữ liệu vào bảng này.'
          : 'You do not have permission to insert data into this table.'
      );
      return;
    }
    setRecordToEdit(null);
    setEditModalOpen(true);
  };

  const handleSaveRecord = async (values: any, isEdit: boolean, origRecord: any) => {
    if (isEdit && origRecord) {
      const keys = extractKeys(origRecord);
      await tableService.updateRow(databaseId, tableName, keys, values, origRecord.RowVersion || origRecord.rv);
      if (selectedRecord) {
        setSelectedRecord({ ...selectedRecord, ...values });
      }
    } else {
      await tableService.createRow(databaseId, tableName, values);
    }
    fetchData();
  };

  const handleDeleteRecord = async (record: any) => {
    if (!canDelete) {
      message.warning(
        language === 'vi'
          ? 'Bạn không có quyền xóa dữ liệu trong bảng này.'
          : 'You do not have permission to delete data in this table.'
      );
      return;
    }
    try {
      const keys = extractKeys(record);
      await tableService.deleteRow(databaseId, tableName, keys, record.RowVersion || record.rv);
      message.success(language === 'vi' ? 'Bản ghi đã được xóa thành công.' : 'Record deleted successfully.');
      if (selectedRecord) {
        setSelectedRecord(null);
        setDetailDrawerOpen(false);
      }
      fetchData();
    } catch (err: any) {
      message.error(err?.response?.data?.message || err?.message || 'Không thể xóa bản ghi.');
    }
  };

  const handleBulkDelete = () => {
    if (selectedRowKeys.length === 0) return;
    if (!canDelete) {
      message.warning(
        language === 'vi'
          ? 'Bạn không có quyền xóa dữ liệu trong bảng này.'
          : 'You do not have permission to delete data in this table.'
      );
      return;
    }

    const isProduction = database?.environment === 'Production' || database?.name?.toLowerCase().includes('prod') || databaseId?.toLowerCase().includes('prod');

    Modal.confirm({
      title: language === 'vi' ? `Xác nhận xóa ${selectedRowKeys.length} bản ghi đã chọn?` : `Confirm delete ${selectedRowKeys.length} selected records?`,
      icon: <ExclamationCircleOutlined style={{ color: '#ef4444' }} />,
      content: (
        <div>
          {isProduction && (
            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #f87171', borderRadius: 6, padding: '8px 12px', marginBottom: 12 }}>
              <Text strong style={{ color: '#b91c1c' }}>
                {language === 'vi' ? '⚠️ CẢNH BÁO MÔI TRƯỜNG PRODUCTION' : '⚠️ PRODUCTION ENVIRONMENT WARNING'}
              </Text>
              <div style={{ fontSize: 12, color: '#991b1b', marginTop: 4 }}>
                {language === 'vi'
                  ? 'Bạn đang thao tác trên database Production. Thao tác xóa dữ liệu sẽ ảnh hưởng trực tiếp tới môi trường vận hành thực tế!'
                  : 'You are operating on a live Production database. Deleted data cannot be recovered!'}
              </div>
            </div>
          )}
          <p>
            {language === 'vi'
              ? `Bạn chuẩn bị xóa ${selectedRowKeys.length} bản ghi khỏi bảng dbo.${tableName}.`
              : `You are about to delete ${selectedRowKeys.length} records from dbo.${tableName}.`}
          </p>
          <Text type="danger">
            {language === 'vi'
              ? 'Thao tác này thực thi bên trong giao dịch nguyên tử (transaction) và ghi nhận nhật ký kiểm toán hệ thống.'
              : 'This action executes inside an atomic transaction and is logged in system audit trail.'}
          </Text>
        </div>
      ),
      okText: language === 'vi' ? `Xóa ${selectedRowKeys.length} bản ghi` : `Delete ${selectedRowKeys.length} records`,
      okType: 'danger',
      cancelText: language === 'vi' ? 'Hủy bỏ' : 'Cancel',
      onOk: async () => {
        try {
          const rowsToDelete = selectedRowKeys.map((k) => {
            const rec = data.find((d) => String(d[primaryKeyCol] ?? d.id ?? d.MaNhanVien) === String(k));
            const keys = rec ? extractKeys(rec) : { [primaryKeyCol]: k };
            return { keys, rowVersion: rec?.RowVersion || rec?.rv };
          });
          const res = await tableService.bulkDeleteRows(databaseId, tableName, rowsToDelete);
          message.success(
            language === 'vi'
              ? `Đã xóa thành công ${res.deletedCount} bản ghi.`
              : `Successfully deleted ${res.deletedCount} records.`
          );
          setSelectedRowKeys([]);
          fetchData();
        } catch (err: any) {
          message.error(err?.response?.data?.message || err?.message || 'Xóa hàng loạt thất bại.');
        }
      },
    });
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
            title: language === 'vi' ? 'Họ và Tên' : 'Full Name',
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
            title: language === 'vi' ? 'Xưởng' : 'Workshop',
            dataIndex: 'Xuong',
            key: 'Xuong',
            width: 90,
            align: 'center' as const,
            sorter: true,
            sortOrder: sortField === 'Xuong' ? sortOrder : null,
            render: (val: number) => <Tag color="blue">{language === 'vi' ? `Xưởng ${val}` : `Shop ${val}`}</Tag>,
          });
          break;
        case 'DeptName0':
          cols.push({
            title: language === 'vi' ? 'Phòng / Tổ' : 'Department',
            dataIndex: 'DeptName0',
            key: 'DeptName0',
            width: 160,
          });
          break;
        case 'Status':
          cols.push({
            title: language === 'vi' ? 'Tình trạng' : 'Status',
            dataIndex: 'Status',
            key: 'Status',
            width: 120,
            render: (status: string) => <StatusBadge status={status} size="small" />,
          });
          break;
        case 'IsDisplay':
          cols.push({
            title: language === 'vi' ? 'Hiển thị' : 'Display',
            dataIndex: 'IsDisplay',
            key: 'IsDisplay',
            width: 100,
            align: 'center' as const,
            render: (val: boolean) => (
              <Tag color={val ? 'green' : 'default'} style={{ margin: 0 }}>
                {val ? (language === 'vi' ? 'Có' : 'Yes') : (language === 'vi' ? 'Không' : 'No')}
              </Tag>
            ),
          });
          break;
        case 'SalaryGrade':
          cols.push({
            title: language === 'vi' ? 'Bậc lương' : 'Grade',
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
            sorter: true,
            sortOrder: sortField === col.key ? sortOrder : null,
          });
          break;
        default:
          cols.push({
            title: col.title,
            dataIndex: col.key,
            key: col.key,
            width: 150,
            sorter: true,
            sortOrder: sortField === col.key ? sortOrder : null,
            render: (val: any) => {
              if (val === null || val === undefined) {
                return <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>NULL</span>;
              }
              if (typeof val === 'boolean') {
                return (
                  <Tag color={val ? 'green' : 'default'} style={{ margin: 0 }}>
                    {val ? (language === 'vi' ? 'Có' : 'True') : (language === 'vi' ? 'Không' : 'False')}
                  </Tag>
                );
              }
              if (typeof val === 'object') {
                return <span className="font-mono text-xs">{JSON.stringify(val)}</span>;
              }
              return <span>{String(val)}</span>;
            },
          });
          break;
      }
    });

    // Actions column
    cols.push({
      title: t.common.actions,
      key: 'actions',
      fixed: 'right' as const,
      width: 70,
      align: 'center' as const,
      render: (_: any, record: any) => {
        const rowId = String(record[primaryKeyCol] ?? record.id ?? record.MaNhanVien ?? '');
        const menuItems = [
          {
            key: 'view',
            icon: <EyeOutlined />,
            label: t.table.recordDetails,
            onClick: () => {
              setSelectedRecord(record);
              setDetailDrawerOpen(true);
            },
          },
          {
            key: 'edit',
            icon: <EditOutlined />,
            label: t.table.editRow,
            disabled: !canUpdate,
            onClick: () => handleOpenEdit(record),
          },
          { type: 'divider' as const },
          {
            key: 'delete',
            icon: <DeleteOutlined style={{ color: canDelete ? '#ef4444' : '#94a3b8' }} />,
            label: <span style={{ color: canDelete ? '#ef4444' : '#94a3b8' }}>{t.table.deleteRow}</span>,
            disabled: !canDelete,
            onClick: () => {
              const isProduction = database?.environment === 'Production' || database?.name?.toLowerCase().includes('prod') || databaseId?.toLowerCase().includes('prod');
              Modal.confirm({
                title: t.table.deleteConfirmTitle,
                icon: <ExclamationCircleOutlined style={{ color: '#ef4444' }} />,
                content: (
                  <div>
                    {isProduction && (
                      <div style={{ backgroundColor: '#fef2f2', border: '1px solid #f87171', borderRadius: 6, padding: '8px 12px', marginBottom: 12 }}>
                        <Text strong style={{ color: '#b91c1c' }}>
                          {language === 'vi' ? '⚠️ CẢNH BÁO MÔI TRƯỜNG PRODUCTION' : '⚠️ PRODUCTION ENVIRONMENT WARNING'}
                        </Text>
                        <div style={{ fontSize: 12, color: '#991b1b', marginTop: 4 }}>
                          {language === 'vi'
                            ? 'Bản ghi sẽ bị xóa vĩnh viễn khỏi môi trường live production!'
                            : 'This record will be permanently deleted from live production!'}
                        </div>
                      </div>
                    )}
                    <p>
                      {language === 'vi'
                        ? `Bạn có chắc chắn muốn xóa bản ghi ${rowId} khỏi bảng dbo.${tableName}?`
                        : `Are you sure you want to delete ${rowId} from dbo.${tableName}?`}
                    </p>
                    <Text type="danger">{t.table.deleteConfirmWarning}</Text>
                  </div>
                ),
                okType: 'danger',
                okText: language === 'vi' ? 'Xóa bản ghi' : 'Delete Record',
                cancelText: language === 'vi' ? 'Hủy bỏ' : 'Cancel',
                onOk: () => handleDeleteRecord(record),
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
  }, [columnConfig, sortField, sortOrder, language]);

  return (
    <div>
      {/* Top Page Header */}
      <PageHeader
        title={tableName}
        subtitle={`dbo.${tableName} • SQL Server 2022 Table`}
        breadcrumbs={[
          { title: t.nav.databases, path: '/databases' },
          { title: database?.name || databaseId, path: `/databases/${databaseId}` },
          { title: t.database.tables, path: `/databases/${databaseId}` },
          { title: tableName },
        ]}
        badge={
          <Space>
            <Tag color="blue" style={{ fontWeight: 600 }}>
              {total.toLocaleString()} {t.table.rowCount}
            </Tag>
            {capabilities ? (
              capabilities.isWritable ? (
                <Tag color="green" style={{ fontWeight: 600 }}>
                  {language === 'vi' ? 'Có thể chỉnh sửa' : 'Editable'}
                </Tag>
              ) : capabilities.reason?.toLowerCase().includes('read-only') ? (
                <Tooltip title={capabilities.reason}>
                  <Tag color="red" style={{ fontWeight: 600 }}>
                    {language === 'vi' ? 'Chế độ Chỉ Đọc (Write Disabled)' : 'Write Disabled'}
                  </Tag>
                </Tooltip>
              ) : (
                <Tooltip title={capabilities.reason}>
                  <Tag color="orange" style={{ fontWeight: 600 }}>
                    {language === 'vi' ? 'Chỉ Đọc (Read Only)' : 'Read Only'}
                  </Tag>
                </Tooltip>
              )
            ) : (
              <Tag color="emerald" style={{ fontWeight: 600 }}>
                RBAC Guarded
              </Tag>
            )}
            {capabilities?.hasRowVersion && (
              <Tag color="purple" style={{ fontWeight: 600 }}>
                RowVersion Concurrency
              </Tag>
            )}
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<LayoutOutlined />}
              onClick={() => setShowExplorer(!showExplorer)}
            >
              {showExplorer ? t.table.hideExplorer : t.table.showExplorer}
            </Button>
            <Tooltip title={!canExport ? (language === 'vi' ? 'Bạn không có quyền Xuất dữ liệu (Database.Export)' : 'Lacks Database.Export permission') : ''}>
              <Button icon={<DownloadOutlined />} onClick={handleExport} disabled={!canExport}>
                {t.common.export}
              </Button>
            </Tooltip>
            <Tooltip title={!canInsert ? (language === 'vi' ? 'Bạn không có quyền Thêm dữ liệu (Database.Insert)' : 'Lacks Database.Insert permission') : ''}>
              <Button icon={<UploadOutlined />} onClick={handleImport} disabled={!canInsert}>
                {t.common.import}
              </Button>
            </Tooltip>
            <Tooltip title={!canInsert ? (language === 'vi' ? 'Bạn không có quyền Thêm bản ghi (Database.Insert)' : 'Lacks Database.Insert permission') : ''}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleOpenCreate}
                disabled={!canInsert}
              >
                {t.table.addRow}
              </Button>
            </Tooltip>
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
                  <span>{t.table.dataTab} ({total})</span>
                </Space>
              </Radio.Button>
              <Radio.Button value="schema">
                <Space size={6}>
                  <InfoCircleOutlined />
                  <span>{t.table.schemaTab}</span>
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
                  <Radio.Button value="compact">{t.table.compact}</Radio.Button>
                  <Radio.Button value="normal">{t.table.normal}</Radio.Button>
                  <Radio.Button value="comfortable">{t.table.comfortable}</Radio.Button>
                </Radio.Group>

                {/* Column Visibility */}
                <Button
                  size="small"
                  icon={<AppstoreOutlined />}
                  onClick={() => setColumnDrawerOpen(true)}
                >
                  {t.table.columnsBtn}
                </Button>

                {/* Filter Builder Button */}
                <Badge count={filters.length} offset={[-4, 4]}>
                  <Button
                    size="small"
                    type={filters.length > 0 ? 'primary' : 'default'}
                    icon={<FilterOutlined />}
                    onClick={() => setFilterDrawerOpen(true)}
                  >
                    {t.table.filterBtn}
                  </Button>
                </Badge>

                {/* Refresh */}
                <Tooltip title={t.common.refresh}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <Input
                    prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                    placeholder={t.table.searchTable}
                    allowClear
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    style={{ maxWidth: 360, borderRadius: 6 }}
                  />

                  {selectedRowKeys.length > 0 && (
                    <Space size={8}>
                      <Tag color="geekblue" style={{ fontSize: 13, padding: '2px 8px', margin: 0 }}>
                        {language === 'vi' ? `Đã chọn: ${selectedRowKeys.length}` : `Selected: ${selectedRowKeys.length}`}
                      </Tag>
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        disabled={!canDelete}
                        onClick={handleBulkDelete}
                      >
                        {language === 'vi' ? `Xóa ${selectedRowKeys.length} dòng` : `Delete ${selectedRowKeys.length} rows`}
                      </Button>
                      <Button type="link" size="small" onClick={() => setSelectedRowKeys([])}>
                        {language === 'vi' ? 'Bỏ chọn' : 'Deselect'}
                      </Button>
                    </Space>
                  )}
                </div>

                {/* Active filter tags */}
                {filters.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{t.table.activeFilters}</Text>
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
                      {t.table.clearAll}
                    </Button>
                  </div>
                )}
              </div>

              {/* Data Table */}
              <DataTable
                columns={tableColumns}
                dataSource={data}
                loading={loading}
                rowKey={(record) =>
                  String(record?.[primaryKeyCol] ?? record?.id ?? record?.MaNhanVien ?? Math.random())
                }
                onChange={handleTableChange}
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
                <div style={{ padding: 40, textAlign: 'center' }}>{t.common.loading}</div>
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
        columns={schema?.columns || []}
        primaryKeys={primaryKeyCols}
        tableName={tableName}
        databaseId={databaseId}
        canEdit={canUpdate}
        canDelete={canDelete}
        onEdit={(rec) => {
          setDetailDrawerOpen(false);
          handleOpenEdit(rec);
        }}
        onDelete={(rec) => {
          setDetailDrawerOpen(false);
          handleDeleteRecord(rec);
        }}
      />

      <DynamicRowModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        record={recordToEdit}
        columns={schema?.columns || []}
        primaryKeys={primaryKeyCols}
        tableName={tableName}
        onSave={handleSaveRecord}
      />
    </div>
  );
};
