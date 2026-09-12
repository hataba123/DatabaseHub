export type CompareStatus =
  | 'Same'
  | 'Different'
  | 'Missing in Source'
  | 'Missing in Target';

export interface TableCompareResult {
  tableName: string;
  sourceRowCount: number;
  targetRowCount: number;
  differencesCount: number;
  status: CompareStatus;
}

export interface RowCompareResult {
  primaryKey: string;
  sourceStatus: 'Exists' | 'Missing';
  targetStatus: 'Exists' | 'Missing';
  status: 'Same' | 'Different' | 'Missing in Source' | 'Missing in Target';
  sourceData?: Record<string, any>;
  targetData?: Record<string, any>;
}
