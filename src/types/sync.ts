export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
}

export type SyncDirection = 'SourceToTarget' | 'TargetToSource';

export type SyncPlanStatus =
  | 'Draft'
  | 'Validating'
  | 'Ready'
  | 'AwaitingApproval'
  | 'Approved'
  | 'Executing'
  | 'Completed'
  | 'CompletedWithErrors'
  | 'Failed'
  | 'Cancelled'
  | 'Expired'
  | 'Rejected';

export type SyncOperationType = 'Insert' | 'Update' | 'Delete' | 'Skip' | 'Blocked';

export type SyncOperationStatus = 'Pending' | 'Success' | 'Failed' | 'Skipped' | 'Conflict' | 'Blocked';

export interface SyncPlanOptions {
  insertMissing: boolean;
  updateDifferent: boolean;
  deleteExtra: boolean;
  batchSize: number;
  continueNextBatch: boolean;
  skipConflicts: boolean;
}

export interface ValidationSummary {
  isValid: boolean;
  canExecute: boolean;
  errors: string[];
  warnings: string[];
  validCount: number;
  blockedCount: number;
  conflictCount: number;
}

export interface DryRunResult {
  success: boolean;
  wouldInsert: number;
  wouldUpdate: number;
  wouldDelete: number;
  conflicts: number;
  errors: number;
  message: string;
  logMessages: string[];
}

export interface SyncPlan {
  id: string;
  compareSessionId: string;
  createdByUserId: string;
  createdByUsername: string;

  sourceConnectionId: string;
  sourceDatabase: string;
  targetConnectionId: string;
  targetDatabase: string;

  direction: SyncDirection;
  status: SyncPlanStatus;
  environment: string;

  createdAt: string;
  validatedAt?: string;
  approvedAt?: string;
  executedAt?: string;
  completedAt?: string;

  totalOperations: number;
  insertCount: number;
  updateCount: number;
  deleteCount: number;
  skippedCount: number;
  blockedCount: number;

  options: SyncPlanOptions;
  validation?: ValidationSummary;

  approvalRequired: boolean;
  approvedByUserId?: string;
  approvedByUsername?: string;
  rejectionReason?: string;

  version: number;

  dryRunCompletedAt?: string;
  dryRunPlanVersion?: number;
  dryRunResult?: DryRunResult;
}

export interface SyncOperation {
  id: string;
  syncPlanId: string;
  order: number;
  schemaName: string;
  tableName: string;
  primaryKey: string;
  keyValues: Record<string, any>;
  operationType: SyncOperationType;
  status: SyncOperationStatus;
  isSelected: boolean;

  sourceValues?: Record<string, any>;
  targetValues?: Record<string, any>;
  changedColumns: string[];

  expectedTargetVersion?: string;
  errorCode?: string;
  errorMessage?: string;
  executedAt?: string;
  durationMs?: number;
}

export interface SyncExecution {
  id: string;
  syncPlanId: string;
  status: 'Pending' | 'Running' | 'Completed' | 'CompletedWithErrors' | 'Failed' | 'Cancelled';
  startedByUsername: string;
  startedAt: string;
  completedAt?: string;

  currentTable?: string;
  currentOperation?: string;

  totalOperations: number;
  completedOperations: number;
  failedOperations: number;
  skippedOperations: number;
  conflictOperations: number;
  progressPercent: number;

  errorMessage?: string;
  resultSummary?: Record<string, any>;
}

export interface CreateSyncPlanRequest {
  compareSessionId: string;
  direction: SyncDirection;
  options: Partial<SyncPlanOptions>;
}

export interface UpdateSelectionRequest {
  operationIds?: string[];
  operationType?: string;
  tableName?: string;
  selectAll?: boolean;
  deselectAll?: boolean;
  selected: boolean;
}

export interface ApprovePlanRequest {
  comment?: string;
}

export interface RejectPlanRequest {
  reason: string;
}

export interface ReversalPlanResponse {
  newPlanId: string;
  originalPlanId: string;
  executionId: string;
  operationsCount: number;
  message: string;
}

export interface CompareSessionSummary {
  id: string;
  sourceConnectionId: string;
  sourceDatabase: string;
  targetConnectionId: string;
  targetDatabase: string;
  status: string;
  createdAt: string;
  completedAt?: string;
  totalTablesCompared: number;
  tablesWithDifferences: number;
  totalDifferencesCount: number;
}
