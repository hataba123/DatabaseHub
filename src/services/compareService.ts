import { TableCompareResult, RowCompareResult } from '@/types/compare';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockCompareTables: TableCompareResult[] = [
  {
    tableName: 'NhanVienDaiThanh',
    sourceRowCount: 12584,
    targetRowCount: 12580,
    differencesCount: 4,
    status: 'Different',
  },
  {
    tableName: 'HQ_Size',
    sourceRowCount: 82,
    targetRowCount: 82,
    differencesCount: 0,
    status: 'Same',
  },
  {
    tableName: 'HQ_PhieuCan',
    sourceRowCount: 82420,
    targetRowCount: 82419,
    differencesCount: 1,
    status: 'Different',
  },
  {
    tableName: 'HQ_PhieuCanNhapNguyenLieu',
    sourceRowCount: 54100,
    targetRowCount: 54100,
    differencesCount: 0,
    status: 'Same',
  },
  {
    tableName: 'Departments',
    sourceRowCount: 45,
    targetRowCount: 45,
    differencesCount: 0,
    status: 'Same',
  },
  {
    tableName: 'AuditLogs_Archive',
    sourceRowCount: 15400,
    targetRowCount: 0,
    differencesCount: 15400,
    status: 'Missing in Target',
  },
];

export const mockRowDifferences: RowCompareResult[] = [
  {
    primaryKey: 'AD38877',
    sourceStatus: 'Exists',
    targetStatus: 'Missing',
    status: 'Missing in Target',
    sourceData: {
      MaNhanVien: 'AD38877',
      Name: 'Lê Thành Ký',
      Xuong: 2,
      DeptName0: 'Nhóm SC14-AD',
      Status: 'Đang Làm',
    },
    targetData: undefined,
  },
  {
    primaryKey: 'AD38904',
    sourceStatus: 'Exists',
    targetStatus: 'Exists',
    status: 'Same',
    sourceData: {
      MaNhanVien: 'AD38904',
      Name: 'Bùi Thị Tuyết Sang',
      Xuong: 2,
      DeptName0: 'Nhóm SC15-AD',
      Status: 'Đang Làm',
    },
    targetData: {
      MaNhanVien: 'AD38904',
      Name: 'Bùi Thị Tuyết Sang',
      Xuong: 2,
      DeptName0: 'Nhóm SC15-AD',
      Status: 'Đang Làm',
    },
  },
  {
    primaryKey: 'AD39001',
    sourceStatus: 'Exists',
    targetStatus: 'Exists',
    status: 'Different',
    sourceData: {
      MaNhanVien: 'AD39001',
      Name: 'Nguyễn Văn Minh (Data A)',
      Xuong: 1,
      DeptName0: 'Tổ Cơ Khí 1',
      Status: 'Đang Làm',
    },
    targetData: {
      MaNhanVien: 'AD39001',
      Name: 'Nguyễn Văn Minh (Data B)',
      Xuong: 2,
      DeptName0: 'Tổ Hàn Cắt 2',
      Status: 'Nghỉ Phép',
    },
  },
  {
    primaryKey: 'AD39005',
    sourceStatus: 'Exists',
    targetStatus: 'Missing',
    status: 'Missing in Target',
    sourceData: {
      MaNhanVien: 'AD39005',
      Name: 'Trần Văn Cảnh',
      Xuong: 3,
      DeptName0: 'Phòng KCS / QC',
      Status: 'Đang Làm',
    },
    targetData: undefined,
  },
];

class CompareService {
  async getTableComparisons(
    _sourceId: string,
    _targetId: string
  ): Promise<TableCompareResult[]> {
    await delay(350);
    return mockCompareTables;
  }

  async getRowComparisons(
    _sourceId: string,
    _targetId: string,
    _tableName: string
  ): Promise<RowCompareResult[]> {
    await delay(300);
    return mockRowDifferences;
  }

  async executeSync(
    _sourceId: string,
    _targetId: string,
    _selectedRows: string[]
  ): Promise<{ success: boolean; rowsSynced: number; message: string }> {
    await delay(900);
    return {
      success: true,
      rowsSynced: _selectedRows.length || 7,
      message: 'Synchronization completed successfully. 7 rows updated/inserted.',
    };
  }
}

export const compareService = new CompareService();
