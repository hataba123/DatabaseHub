import { DatabaseConnection, DatabaseStats } from '@/types/database';
import {
  mockDatabases,
  mockDashboardStats,
  mockActivityHistory,
  mockStorageBreakdown,
} from '@/mocks/databases.mock';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class DatabaseService {
  private databases: DatabaseConnection[] = [...mockDatabases];

  async getDatabases(): Promise<DatabaseConnection[]> {
    await delay(250);
    return [...this.databases];
  }

  async getDatabase(id: string): Promise<DatabaseConnection | null> {
    await delay(150);
    const db = this.databases.find((d) => d.id === id);
    return db ? { ...db } : null;
  }

  async testConnection(
    _config: Partial<DatabaseConnection>
  ): Promise<{ success: boolean; latencyMs: number; message: string }> {
    await delay(800);
    return {
      success: true,
      latencyMs: Math.floor(Math.random() * 20) + 8,
      message: 'Connection successful. SQL Server response verified.',
    };
  }

  async saveConnection(
    conn: Partial<DatabaseConnection>
  ): Promise<DatabaseConnection> {
    await delay(400);
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

    const index = this.databases.findIndex((d) => d.id === id);
    if (index >= 0) {
      this.databases[index] = { ...this.databases[index], ...newDb };
    } else {
      this.databases.unshift(newDb);
    }
    return newDb;
  }

  async deleteConnection(id: string): Promise<boolean> {
    await delay(300);
    this.databases = this.databases.filter((d) => d.id !== id);
    return true;
  }

  async getDashboardStats(): Promise<DatabaseStats> {
    await delay(200);
    const onlineCount = this.databases.filter((d) => d.status === 'Online').length;
    const warningCount = this.databases.filter((d) => d.status === 'Warning').length;
    const offlineCount = this.databases.filter((d) => d.status === 'Offline').length;

    return {
      ...mockDashboardStats,
      connectedDatabases: this.databases.length,
      onlineCount,
      warningCount,
      offlineCount,
    };
  }

  async getActivityHistory() {
    await delay(150);
    return mockActivityHistory;
  }

  async getStorageBreakdown() {
    await delay(150);
    return mockStorageBreakdown;
  }
}

export const databaseService = new DatabaseService();
