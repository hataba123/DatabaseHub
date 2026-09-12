import { apiClient } from './apiClient';
import { DatabaseConnection } from '@/types/database';

export interface BackendConnectionResponse {
  id: string;
  name: string;
  environment: 'Production' | 'Staging' | 'Development';
  server: string;
  port: number;
  database: string;
  authenticationType: string;
  username?: string;
  encrypt: boolean;
  trustServerCertificate: boolean;
  isEnabled: boolean;
  status: string;
  createdAt: string;
}

export interface BackendTestConnectionResponse {
  success: boolean;
  serverVersion?: string;
  database?: string;
  elapsedMilliseconds: number;
  message?: string;
}

export function mapBackendToConnection(b: BackendConnectionResponse): DatabaseConnection {
  return {
    id: b.id,
    name: b.name,
    environment: (b.environment as any) || 'Production',
    serverHost: b.server,
    port: b.port,
    databaseName: b.database,
    serverVersion: 'SQL Server',
    status: (b.status as any) || 'Online',
    sizeGb: 0,
    storageLimitGb: 100,
    tablesCount: 0,
    viewsCount: 0,
    proceduresCount: 0,
    activeConnections: 1,
    lastChecked: new Date().toISOString(),
    authType:
      b.authenticationType === 'Windows' || b.authenticationType === 'Windows Authentication'
        ? 'Windows Authentication'
        : 'SQL Server Authentication',
    username: b.username,
    encryptConnection: b.encrypt,
    trustServerCertificate: b.trustServerCertificate,
    createdAt: b.createdAt ? b.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
  };
}

export const connectionApi = {
  getConnections: async (): Promise<DatabaseConnection[]> => {
    const list = await apiClient.get<BackendConnectionResponse[]>('/database-connections');
    return list.map(mapBackendToConnection);
  },

  getConnection: async (id: string): Promise<DatabaseConnection> => {
    const conn = await apiClient.get<BackendConnectionResponse>(`/database-connections/${id}`);
    return mapBackendToConnection(conn);
  },

  createConnection: async (data: {
    name: string;
    environment?: string;
    serverHost: string;
    port?: number;
    databaseName?: string;
    authType?: string;
    username?: string;
    password?: string;
    encryptConnection?: boolean;
    trustServerCertificate?: boolean;
  }): Promise<DatabaseConnection> => {
    const payload = {
      name: data.name,
      environment: data.environment || 'Development',
      server: data.serverHost,
      port: data.port || 1433,
      database: data.databaseName || '',
      authenticationType:
        data.authType === 'Windows Authentication' ? 'Windows' : 'SqlServer',
      username: data.username,
      password: data.password,
      encrypt: data.encryptConnection ?? true,
      trustServerCertificate: data.trustServerCertificate ?? true,
    };
    const saved = await apiClient.post<BackendConnectionResponse>('/database-connections', payload);
    return mapBackendToConnection(saved);
  },

  deleteConnection: async (id: string): Promise<void> => {
    await apiClient.delete(`/database-connections/${id}`);
  },

  testConnection: async (config: {
    serverHost?: string;
    port?: number;
    databaseName?: string;
    authType?: string;
    username?: string;
    password?: string;
    encryptConnection?: boolean;
    trustServerCertificate?: boolean;
  }): Promise<{ success: boolean; latencyMs: number; message: string; serverVersion?: string }> => {
    const payload = {
      server: config.serverHost,
      port: config.port || 1433,
      database: config.databaseName || '',
      authenticationType:
        config.authType === 'Windows Authentication' ? 'Windows' : 'SqlServer',
      username: config.username,
      password: config.password,
      encrypt: config.encryptConnection ?? true,
      trustServerCertificate: config.trustServerCertificate ?? true,
    };
    const res = await apiClient.post<BackendTestConnectionResponse>(
      '/database-connections/test',
      payload
    );
    return {
      success: res.success,
      latencyMs: res.elapsedMilliseconds,
      message: res.message || (res.success ? 'Connection successful' : 'Connection failed'),
      serverVersion: res.serverVersion,
    };
  },

  testSavedConnection: async (
    id: string
  ): Promise<{ success: boolean; latencyMs: number; message: string; serverVersion?: string }> => {
    const res = await apiClient.post<BackendTestConnectionResponse>(
      `/database-connections/${id}/test`
    );
    return {
      success: res.success,
      latencyMs: res.elapsedMilliseconds,
      message: res.message || (res.success ? 'Connection successful' : 'Connection failed'),
      serverVersion: res.serverVersion,
    };
  },
};
