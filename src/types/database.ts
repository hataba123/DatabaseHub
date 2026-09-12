export type DatabaseEnvironment = 'Production' | 'Staging' | 'Development';

export type DatabaseStatus = 'Online' | 'Warning' | 'Offline';

export type AuthType = 'SQL Server Authentication' | 'Windows Authentication';

export interface DatabaseConnection {
  id: string;
  name: string;
  environment: DatabaseEnvironment;
  serverHost: string;
  port: number;
  databaseName: string;
  serverVersion: string;
  status: DatabaseStatus;
  sizeGb: number;
  storageLimitGb: number;
  tablesCount: number;
  viewsCount: number;
  proceduresCount: number;
  activeConnections: number;
  lastChecked: string;
  authType: AuthType;
  username?: string;
  encryptConnection: boolean;
  trustServerCertificate: boolean;
  createdAt: string;
  description?: string;
}

export interface DatabaseStats {
  connectedDatabases: number;
  onlineCount: number;
  warningCount: number;
  offlineCount: number;
  activeConnections: number;
  queriesPerMinute: number;
  slowQueries: number;
  storageUsedGb: number;
  storageTotalGb: number;
}
