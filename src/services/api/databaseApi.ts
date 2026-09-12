import { apiClient } from './apiClient';
import {
  DatabaseObjectItem,
  TableDataResponse,
  TableQueryParams,
  TableSchema,
  DatabaseColumn,
  DatabaseIndex,
  DatabaseRelationship,
} from '@/types/table';

export interface BackendDatabaseItem {
  name: string;
  state: string;
  createdAt?: string;
  sizeMb?: number;
}

export interface BackendTableItem {
  schema: string;
  name: string;
  rowCount: number;
}

export interface BackendViewItem {
  schema: string;
  name: string;
}

export interface BackendProcedureItem {
  schema: string;
  name: string;
}

export interface BackendColumnItem {
  name: string;
  dataType: string;
  maxLength?: number;
  nullable: boolean;
  isPrimaryKey: boolean;
  isIdentity: boolean;
}

export interface BackendIndexItem {
  name: string;
  type: string;
  unique: boolean;
  primaryKey: boolean;
  columns: string[];
}

export interface BackendRelationshipItem {
  name: string;
  column: string;
  referencedSchema: string;
  referencedTable: string;
  referencedColumn: string;
}

export interface BackendPagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalRows: number;
}

export const databaseApi = {
  getDatabases: async (connectionId: string): Promise<BackendDatabaseItem[]> => {
    return apiClient.get<BackendDatabaseItem[]>(`/connections/${connectionId}/databases`);
  },

  getDatabaseObjects: async (
    connectionId: string,
    databaseName: string
  ): Promise<DatabaseObjectItem[]> => {
    const [tables, views, procs] = await Promise.all([
      apiClient.get<BackendTableItem[]>(`/connections/${connectionId}/databases/${databaseName}/tables`),
      apiClient.get<BackendViewItem[]>(`/connections/${connectionId}/databases/${databaseName}/views`),
      apiClient.get<BackendProcedureItem[]>(
        `/connections/${connectionId}/databases/${databaseName}/procedures`
      ),
    ]);

    const items: DatabaseObjectItem[] = [];

    tables.forEach((t) => {
      items.push({
        id: `tbl-${t.schema}-${t.name}`,
        name: t.name,
        schema: t.schema,
        type: 'table',
        rowCount: t.rowCount,
      });
    });

    views.forEach((v) => {
      items.push({
        id: `view-${v.schema}-${v.name}`,
        name: v.name,
        schema: v.schema,
        type: 'view',
      });
    });

    procs.forEach((p) => {
      items.push({
        id: `proc-${p.schema}-${p.name}`,
        name: p.name,
        schema: p.schema,
        type: 'procedure',
      });
    });

    return items;
  },

  getTableSchema: async (
    connectionId: string,
    databaseName: string,
    schema: string,
    tableName: string
  ): Promise<TableSchema> => {
    const [cols, idxs, rels] = await Promise.all([
      apiClient.get<BackendColumnItem[]>(
        `/connections/${connectionId}/databases/${databaseName}/tables/${schema}/${tableName}/columns`
      ),
      apiClient.get<BackendIndexItem[]>(
        `/connections/${connectionId}/databases/${databaseName}/tables/${schema}/${tableName}/indexes`
      ),
      apiClient.get<BackendRelationshipItem[]>(
        `/connections/${connectionId}/databases/${databaseName}/tables/${schema}/${tableName}/relationships`
      ),
    ]);

    const mappedColumns: DatabaseColumn[] = cols.map((c) => ({
      name: c.name,
      dataType: c.dataType + (c.maxLength && c.maxLength > 0 ? `(${c.maxLength})` : ''),
      nullable: c.nullable,
      isPrimaryKey: c.isPrimaryKey,
    }));

    const mappedIndexes: DatabaseIndex[] = idxs.map((i) => ({
      name: i.name,
      type: i.type.includes('CLUSTERED') && !i.type.includes('NON') ? 'Clustered' : 'Non-Clustered',
      columns: i.columns,
      isUnique: i.unique,
    }));

    const mappedRels: DatabaseRelationship[] = rels.map((r) => ({
      constraintName: r.name,
      column: r.column,
      foreignTable: r.referencedTable,
      foreignColumn: r.referencedColumn,
    }));

    return {
      databaseId: connectionId,
      tableName,
      schema,
      columns: mappedColumns,
      indexes: mappedIndexes,
      relationships: mappedRels,
    };
  },

  getTableData: async (
    connectionId: string,
    databaseName: string,
    schema: string,
    tableName: string,
    params: TableQueryParams
  ): Promise<TableDataResponse<any>> => {
    const payload = {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search || undefined,
      sortColumn: params.sortField || undefined,
      sortDirection: params.sortOrder === 'descend' ? 'desc' : 'asc',
      filters: params.filters?.map((f) => ({
        field: f.field,
        operator: f.operator,
        value: f.value,
        value2: f.value2,
      })),
    };

    const res = await apiClient.post<BackendPagedResult<any>>(
      `/connections/${connectionId}/databases/${databaseName}/tables/${schema}/${tableName}/rows/query`,
      payload
    );

    return {
      data: res.items,
      total: res.totalRows,
      page: res.page,
      pageSize: res.pageSize,
    };
  },
};
