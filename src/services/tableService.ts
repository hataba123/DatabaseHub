import {
  DatabaseObjectItem,
  TableDataResponse,
  TableQueryParams,
  TableSchema,
} from '@/types/table';
import {
  mockDatabaseObjects,
  mockNhanVienSchema,
} from '@/mocks/tables.mock';
import { mockNhanVienList, NhanVienRecord } from '@/mocks/nhanvien.mock';
import { applyFilters } from '@/utils/filterEvaluator';
import { databaseService } from './databaseService';
import { databaseApi } from './api/databaseApi';
import { crudApi } from './api/crudApi';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function parseSchemaAndTable(tableName: string): { schema: string; table: string } {
  if (tableName.includes('.')) {
    const parts = tableName.split('.');
    return { schema: parts[0], table: parts.slice(1).join('.') };
  }
  return { schema: 'dbo', table: tableName };
}

class TableService {
  private nhanvienData: NhanVienRecord[] = [...mockNhanVienList];
  private isApiMode = import.meta.env.VITE_DATA_SOURCE !== 'mock';

  async getDatabaseObjects(databaseId: string): Promise<DatabaseObjectItem[]> {
    if (this.isApiMode) {
      try {
        const conn = await databaseService.getDatabase(databaseId);
        if (conn && conn.databaseName) {
          const objects = await databaseApi.getDatabaseObjects(conn.id, conn.databaseName);
          if (objects && objects.length > 0) {
            return objects;
          }
        }
      } catch (err) {
        console.warn('API getDatabaseObjects failed, falling back to mock objects:', err);
      }
    }

    await delay(150);
    return mockDatabaseObjects[databaseId] || mockDatabaseObjects['pmsc'] || [];
  }

  async getTableSchema(
    databaseId: string,
    tableName: string
  ): Promise<TableSchema> {
    if (this.isApiMode) {
      try {
        const conn = await databaseService.getDatabase(databaseId);
        if (conn && conn.databaseName) {
          const { schema, table } = parseSchemaAndTable(tableName);
          const s = await databaseApi.getTableSchema(conn.id, conn.databaseName, schema, table);
          if (s && s.columns && s.columns.length > 0) {
            return s;
          }
        }
      } catch (err) {
        console.warn('API getTableSchema failed, falling back to mock schema:', err);
      }
    }

    await delay(100);
    if (tableName === 'NhanVienDaiThanh' || databaseId === 'pmsc') {
      return {
        ...mockNhanVienSchema,
        tableName,
      };
    }

    // Generic fallback schema
    return {
      databaseId,
      tableName,
      schema: 'dbo',
      columns: [
        { name: 'Id', dataType: 'int', nullable: false, isPrimaryKey: true },
        { name: 'Code', dataType: 'nvarchar(50)', nullable: false, isPrimaryKey: false },
        { name: 'Name', dataType: 'nvarchar(255)', nullable: true, isPrimaryKey: false },
        { name: 'CreatedAt', dataType: 'datetime', nullable: true, isPrimaryKey: false },
      ],
      indexes: [
        { name: `PK_${tableName}`, type: 'Clustered', columns: ['Id'], isUnique: true },
      ],
      relationships: [],
    };
  }

  async getTableData(
    databaseId: string,
    tableName: string,
    params: TableQueryParams
  ): Promise<TableDataResponse<any>> {
    if (this.isApiMode) {
      try {
        const conn = await databaseService.getDatabase(databaseId);
        if (conn && conn.databaseName) {
          const { schema, table } = parseSchemaAndTable(tableName);
          const result = await databaseApi.getTableData(
            conn.id,
            conn.databaseName,
            schema,
            table,
            params
          );
          return result;
        }
      } catch (err) {
        console.warn('API getTableData failed, falling back to mock data:', err);
      }
    }

    await delay(200);
    let items = [...this.nhanvienData];

    // 1. Search across text fields
    if (params.search && params.search.trim() !== '') {
      const q = params.search.toLowerCase().trim();
      items = items.filter(
        (r) =>
          r.MaNhanVien.toLowerCase().includes(q) ||
          r.Name.toLowerCase().includes(q) ||
          r.DeptName0.toLowerCase().includes(q) ||
          r.Address.toLowerCase().includes(q) ||
          r.Tel.toLowerCase().includes(q)
      );
    }

    // 2. Filters from filter builder
    if (params.filters && params.filters.length > 0) {
      items = applyFilters(items, params.filters);
    }

    // 3. Sorting
    if (params.sortField && params.sortOrder) {
      const field = params.sortField as keyof NhanVienRecord;
      const isAsc = params.sortOrder === 'ascend';
      items.sort((a, b) => {
        const valA = a[field];
        const valB = b[field];
        if (valA === valB) return 0;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        if (typeof valA === 'number' && typeof valB === 'number') {
          return isAsc ? valA - valB : valB - valA;
        }
        return isAsc
          ? String(valA).localeCompare(String(valB), 'vi')
          : String(valB).localeCompare(String(valA), 'vi');
      });
    }

    // 4. Pagination
    const total = items.length;
    const page = params.page || 1;
    const pageSize = params.pageSize || 25;
    const startIndex = (page - 1) * pageSize;
    const paginatedData = items.slice(startIndex, startIndex + pageSize);

    return {
      data: paginatedData,
      total,
      page,
      pageSize,
    };
  }

  async getTableCapabilities(
    databaseId: string,
    tableName: string
  ) {
    if (this.isApiMode) {
      try {
        const conn = await databaseService.getDatabase(databaseId);
        if (conn && conn.databaseName) {
          const { schema, table } = parseSchemaAndTable(tableName);
          return await crudApi.getTableCapabilities(conn.id, conn.databaseName, schema, table);
        }
      } catch (err) {
        console.warn('API getTableCapabilities failed:', err);
      }
    }
    return {
      canInsert: true,
      canUpdate: true,
      canDelete: true,
      isWritable: true,
      primaryKeys: ['MaNhanVien'],
      hasRowVersion: false,
    };
  }

  async createRow(
    databaseId: string,
    tableName: string,
    row: Record<string, any>
  ): Promise<any> {
    if (this.isApiMode) {
      const conn = await databaseService.getDatabase(databaseId);
      if (conn && conn.databaseName) {
        const { schema, table } = parseSchemaAndTable(tableName);
        const res = await crudApi.createRow(conn.id, conn.databaseName, schema, table, row);
        return res.data ?? row;
      }
    }

    await delay(200);
    const newRecord: NhanVienRecord = {
      MaNhanVien: row.MaNhanVien || `AD${Math.floor(40000 + Math.random() * 10000)}`,
      Name: row.Name || 'Nhân Viên Mới',
      Xuong: Number(row.Xuong) || 1,
      DeptName0: row.DeptName0 || 'Nhóm SC14-AD',
      BirthDate: row.BirthDate || '1995-01-01',
      Tel: row.Tel || '0901234567',
      Address: row.Address || 'TP. Hồ Chí Minh',
      IsDisplay: row.IsDisplay ?? true,
      Status: row.Status || 'Đang Làm',
      SalaryGrade: row.SalaryGrade || 'A1',
      JoinedDate: row.JoinedDate || new Date().toISOString().split('T')[0],
    };

    this.nhanvienData.unshift(newRecord);
    return newRecord;
  }

  async updateRow(
    databaseId: string,
    tableName: string,
    keys: string | Record<string, any>,
    row: Record<string, any>,
    rowVersion?: string
  ): Promise<any> {
    const keyDict = typeof keys === 'string'
      ? { MaNhanVien: keys }
      : keys;

    if (this.isApiMode) {
      const conn = await databaseService.getDatabase(databaseId);
      if (conn && conn.databaseName) {
        const { schema, table } = parseSchemaAndTable(tableName);
        const res = await crudApi.updateRow(conn.id, conn.databaseName, schema, table, keyDict, row, rowVersion);
        return res.data ?? row;
      }
    }

    await delay(200);
    const keyVal = typeof keys === 'string' ? keys : Object.values(keys)[0];
    const idx = this.nhanvienData.findIndex((r) => r.MaNhanVien === keyVal);
    if (idx >= 0) {
      this.nhanvienData[idx] = {
        ...this.nhanvienData[idx],
        ...row,
      };
      return this.nhanvienData[idx];
    }
    throw new Error(`Record with key ${keyVal} not found.`);
  }

  async deleteRow(
    databaseId: string,
    tableName: string,
    keys: string | Record<string, any>,
    rowVersion?: string
  ): Promise<boolean> {
    const keyDict = typeof keys === 'string'
      ? { MaNhanVien: keys }
      : keys;

    if (this.isApiMode) {
      const conn = await databaseService.getDatabase(databaseId);
      if (conn && conn.databaseName) {
        const { schema, table } = parseSchemaAndTable(tableName);
        await crudApi.deleteRow(conn.id, conn.databaseName, schema, table, keyDict, rowVersion);
        return true;
      }
    }

    await delay(200);
    const keyVal = typeof keys === 'string' ? keys : Object.values(keys)[0];
    this.nhanvienData = this.nhanvienData.filter((r) => r.MaNhanVien !== keyVal);
    return true;
  }

  async bulkDeleteRows(
    databaseId: string,
    tableName: string,
    rows: Array<{ keys: Record<string, any>; rowVersion?: string }>
  ): Promise<{ totalRequested: number; deletedCount: number }> {
    if (this.isApiMode) {
      const conn = await databaseService.getDatabase(databaseId);
      if (conn && conn.databaseName) {
        const { schema, table } = parseSchemaAndTable(tableName);
        const res = await crudApi.bulkDeleteRows(conn.id, conn.databaseName, schema, table, rows);
        return { totalRequested: res.totalRequested, deletedCount: res.deletedCount };
      }
    }

    await delay(200);
    const keysToDelete = new Set(rows.map((r) => Object.values(r.keys)[0]));
    this.nhanvienData = this.nhanvienData.filter((r) => !keysToDelete.has(r.MaNhanVien));
    return { totalRequested: rows.length, deletedCount: rows.length };
  }
}

export const tableService = new TableService();
