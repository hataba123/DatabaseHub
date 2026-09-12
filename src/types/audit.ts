export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE' | 'SCHEMA_CHANGE' | 'LOGIN';

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  database: string;
  table: string;
  action: AuditAction;
  recordKey: string;
  status: 'Success' | 'Failed';
  ipAddress?: string;
  beforeData?: Record<string, any> | null;
  afterData?: Record<string, any> | null;
  querySql?: string;
}
