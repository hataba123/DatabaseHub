import { apiClient } from './apiClient';
import { TableCapabilities, RowAuditHistoryItem } from '@/types/table';

export interface RowMutationResult {
  success: boolean;
  affectedRows: number;
  data?: Record<string, any>;
  message?: string;
}

export interface BulkMutationResult {
  totalRequested: number;
  deletedCount: number;
  success: boolean;
  message?: string;
}

export interface LookupItem {
  value: any;
  label: string;
}

export const crudApi = {
  getTableCapabilities: async (
    connectionId: string,
    database: string,
    schema: string,
    table: string
  ): Promise<TableCapabilities> => {
    return apiClient.get<TableCapabilities>(
      `/connections/${connectionId}/databases/${database}/tables/${schema}/${table}/capabilities`
    );
  },

  getRowByKey: async (
    connectionId: string,
    database: string,
    schema: string,
    table: string,
    keys: Record<string, any>
  ): Promise<Record<string, any>> => {
    return apiClient.post<Record<string, any>>(
      `/connections/${connectionId}/databases/${database}/tables/${schema}/${table}/rows/by-key`,
      keys
    );
  },

  createRow: async (
    connectionId: string,
    database: string,
    schema: string,
    table: string,
    values: Record<string, any>
  ): Promise<RowMutationResult> => {
    return apiClient.post<RowMutationResult>(
      `/connections/${connectionId}/databases/${database}/tables/${schema}/${table}/rows`,
      { values }
    );
  },

  updateRow: async (
    connectionId: string,
    database: string,
    schema: string,
    table: string,
    keys: Record<string, any>,
    values: Record<string, any>,
    rowVersion?: string
  ): Promise<RowMutationResult> => {
    return apiClient.put<RowMutationResult>(
      `/connections/${connectionId}/databases/${database}/tables/${schema}/${table}/rows`,
      { keys, values, rowVersion }
    );
  },

  deleteRow: async (
    connectionId: string,
    database: string,
    schema: string,
    table: string,
    keys: Record<string, any>,
    rowVersion?: string
  ): Promise<RowMutationResult> => {
    return apiClient.delete<RowMutationResult>(
      `/connections/${connectionId}/databases/${database}/tables/${schema}/${table}/rows`,
      { keys, rowVersion }
    );
  },

  bulkDeleteRows: async (
    connectionId: string,
    database: string,
    schema: string,
    table: string,
    rows: Array<{ keys: Record<string, any>; rowVersion?: string }>
  ): Promise<BulkMutationResult> => {
    return apiClient.post<BulkMutationResult>(
      `/connections/${connectionId}/databases/${database}/tables/${schema}/${table}/rows/bulk-delete`,
      { rows }
    );
  },

  getLookupValues: async (
    connectionId: string,
    database: string,
    schema: string,
    table: string,
    column: string,
    top: number = 50
  ): Promise<LookupItem[]> => {
    return apiClient.get<LookupItem[]>(
      `/connections/${connectionId}/databases/${database}/tables/${schema}/${table}/lookups/${column}?top=${top}`
    );
  },

  getRowAuditHistory: async (
    connectionId: string,
    database: string,
    schema: string,
    table: string,
    targetId?: string
  ): Promise<RowAuditHistoryItem[]> => {
    const query = targetId ? `?targetId=${encodeURIComponent(targetId)}` : '';
    return apiClient.get<RowAuditHistoryItem[]>(
      `/connections/${connectionId}/databases/${database}/tables/${schema}/${table}/rows/history${query}`
    );
  },
};
