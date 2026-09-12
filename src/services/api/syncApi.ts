import { request } from './apiClient';
import {
  SyncPlan,
  SyncOperation,
  SyncExecution,
  CreateSyncPlanRequest,
  UpdateSelectionRequest,
  ValidationSummary,
  DryRunResult,
  ApprovePlanRequest,
  RejectPlanRequest,
  ReversalPlanResponse,
  CompareSessionSummary,
  PagedResult,
} from '@/types/sync';

export interface CompareSessionDetail extends CompareSessionSummary {
  tableResults: {
    tableName: string;
    schemaName: string;
    sourceRowCount: number;
    targetRowCount: number;
    differencesCount: number;
    status: string;
  }[];
}

export const syncApi = {
  // Compare sessions
  getCompareSessions: (page = 1, pageSize = 20) =>
    request<PagedResult<CompareSessionSummary>>(
      `/compare/sessions?page=${page}&pageSize=${pageSize}`
    ),

  getCompareSession: (id: string) =>
    request<CompareSessionDetail>(`/compare/sessions/${id}`),

  createCompareSession: (data: {
    sourceConnectionId: string;
    sourceDatabase: string;
    targetConnectionId: string;
    targetDatabase: string;
    tables?: string[];
  }) =>
    request<CompareSessionSummary>('/compare/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Sync Plans
  createPlan: (data: CreateSyncPlanRequest) =>
    request<SyncPlan>('/sync/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getPlan: (id: string) => request<SyncPlan>(`/sync/plans/${id}`),

  getPlanOperations: (
    id: string,
    params: {
      page?: number;
      pageSize?: number;
      operationType?: string;
      status?: string;
      tableName?: string;
    } = {}
  ) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.pageSize) query.append('pageSize', params.pageSize.toString());
    if (params.operationType) query.append('operationType', params.operationType);
    if (params.status) query.append('status', params.status);
    if (params.tableName) query.append('tableName', params.tableName);

    return request<PagedResult<SyncOperation>>(
      `/sync/plans/${id}/operations?${query.toString()}`
    );
  },

  updateSelection: (id: string, data: UpdateSelectionRequest) =>
    request<SyncPlan>(`/sync/plans/${id}/selection`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  validatePlan: (id: string) =>
    request<ValidationSummary>(`/sync/plans/${id}/validate`, {
      method: 'POST',
    }),

  runDryRun: (id: string) =>
    request<DryRunResult>(`/sync/plans/${id}/dry-run`, {
      method: 'POST',
    }),

  approvePlan: (id: string, data: ApprovePlanRequest = {}) =>
    request<SyncPlan>(`/sync/plans/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  rejectPlan: (id: string, data: RejectPlanRequest) =>
    request<SyncPlan>(`/sync/plans/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  executePlan: (id: string) =>
    request<SyncExecution>(`/sync/plans/${id}/execute`, {
      method: 'POST',
    }),

  createReversalPlan: (id: string) =>
    request<ReversalPlanResponse>(`/sync/plans/${id}/reversal-plan`, {
      method: 'POST',
    }),

  // Executions
  getExecutions: (page = 1, pageSize = 20) =>
    request<PagedResult<SyncExecution>>(
      `/sync/executions?page=${page}&pageSize=${pageSize}`
    ),

  getExecution: (id: string) =>
    request<SyncExecution>(`/sync/executions/${id}`),

  cancelExecution: (id: string) =>
    request<{ message: string }>(`/sync/executions/${id}/cancel`, {
      method: 'POST',
    }),
};
