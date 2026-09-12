import { DatabaseConnection, DatabaseStats } from '@/types/database';
import {
  mockDatabases,
  mockDashboardStats,
  mockActivityHistory,
  mockStorageBreakdown,
} from '@/mocks/databases.mock';
import { connectionApi } from './api/connectionApi';
import { databaseApi } from './api/databaseApi';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class DatabaseService {
  private mockDbs: DatabaseConnection[] = [...mockDatabases];
  private isApiMode = import.meta.env.VITE_DATA_SOURCE !== 'mock';

  async getDatabases(): Promise<DatabaseConnection[]> {
    if (this.isApiMode) {
      try {
        const apiDbs = await connectionApi.getConnections();
        if (apiDbs && apiDbs.length > 0) {
          return apiDbs;
        }
      } catch (err) {
        console.warn('Backend API unavailable, falling back to mock databases:', err);
      }
    }
    await delay(150);
    return [...this.mockDbs];
  }

  async getDatabase(id: string): Promise<DatabaseConnection | null> {
    if (this.isApiMode) {
      try {
        const db = await connectionApi.getConnection(id);
        if (db) return db;
      } catch (err) {
        // Fallback to local
      }
    }
    await delay(100);
    const found = this.mockDbs.find((d) => d.id === id);
    return found ? { ...found } : null;
  }

  async testConnection(
    config: Partial<DatabaseConnection> & { password?: string }
  ): Promise<{ success: boolean; latencyMs: number; message: string; serverVersion?: string }> {
    if (this.isApiMode) {
      try {
        if (config.id && !config.password && !config.serverHost) {
          // Testing existing saved connection by id
          return await connectionApi.testSavedConnection(config.id);
        }
        return await connectionApi.testConnection({
          serverHost: config.serverHost,
          port: config.port,
          databaseName: config.databaseName,
          authType: config.authType,
          username: config.username,
          password: config.password,
          encryptConnection: config.encryptConnection,
          trustServerCertificate: config.trustServerCertificate,
        });
      } catch (err: any) {
        console.warn('API test connection failed:', err);
        return {
          success: false,
          latencyMs: 0,
          message: err?.message || 'Connection test failed',
        };
      }
    }

    await delay(600);
    return {
      success: true,
      latencyMs: Math.floor(Math.random() * 20) + 8,
      message: 'Connection successful. SQL Server response verified (Mock).',
      serverVersion: 'Microsoft SQL Server 2022 (Mock)',
    };
  }

  async saveConnection(
    conn: Partial<DatabaseConnection> & { password?: string }
  ): Promise<DatabaseConnection> {
    if (this.isApiMode) {
      try {
        const saved = await connectionApi.createConnection({
          name: conn.name || 'New Database Connection',
          environment: conn.environment || 'Development',
          serverHost: conn.serverHost || 'localhost',
          port: conn.port || 1433,
          databaseName: conn.databaseName || '',
          authType: conn.authType || 'SQL Server Authentication',
          username: conn.username,
          password: conn.password,
          encryptConnection: conn.encryptConnection ?? true,
          trustServerCertificate: conn.trustServerCertificate ?? true,
        });
        return saved;
      } catch (err: any) {
        console.warn('API save connection failed, falling back to mock save:', err);
      }
    }

    await delay(300);
    const id = conn.id || `db-${Date.now()}`;
    const newDb: DatabaseConnection = {
      id,
      name: conn.name || 'New Database Connection',
      environment: conn.environment || 'Development',
      serverHost: conn.serverHost || 'localhost',
      port: conn.port || 1433,
      databaseName: conn.databaseName || 'DB_NEW',
      serverVersion: 'SQL Server 2022 Standard',
      status: 'Online',
      sizeGb: 12,
      storageLimitGb: 100,
      tablesCount: 0,
      viewsCount: 0,
      proceduresCount: 0,
      activeConnections: 1,
      lastChecked: new Date().toISOString(),
      authType: conn.authType || 'SQL Server Authentication',
      username: conn.username,
      encryptConnection: conn.encryptConnection ?? true,
      trustServerCertificate: conn.trustServerCertificate ?? true,
      createdAt: new Date().toISOString().split('T')[0],
      description: conn.description || 'Custom database connection',
    };

    const index = this.mockDbs.findIndex((d) => d.id === id);
    if (index >= 0) {
      this.mockDbs[index] = { ...this.mockDbs[index], ...newDb };
    } else {
      this.mockDbs.unshift(newDb);
    }
    return newDb;
  }

  async deleteConnection(id: string): Promise<boolean> {
    if (this.isApiMode) {
      try {
        await connectionApi.deleteConnection(id);
        return true;
      } catch (err) {
        console.warn('API delete connection failed, falling back to mock:', err);
      }
    }
    await delay(200);
    this.mockDbs = this.mockDbs.filter((d) => d.id !== id);
    return true;
  }

  async getDatabasesOnServer(connectionId: string) {
    if (this.isApiMode) {
      try {
        return await databaseApi.getDatabases(connectionId);
      } catch (err) {
        console.warn('Failed to fetch databases on server:', err);
      }
    }
    return [];
  }

  async getDashboardStats(): Promise<DatabaseStats> {
    const dbs = await this.getDatabases();
    const onlineCount = dbs.filter((d) => d.status === 'Online').length;
    const warningCount = dbs.filter((d) => d.status === 'Warning').length;
    const offlineCount = dbs.filter((d) => d.status === 'Offline').length;

    return {
      ...mockDashboardStats,
      connectedDatabases: dbs.length,
      onlineCount,
      warningCount,
      offlineCount,
    };
  }

  async getActivityHistory() {
    await delay(100);
    return mockActivityHistory;
  }

  async getStorageBreakdown() {
    await delay(100);
    return mockStorageBreakdown;
  }
}

export const databaseService = new DatabaseService();
