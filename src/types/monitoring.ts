export interface ServerMetric {
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  queriesPerSecond: number;
  databaseSizeGb: number;
  history: Array<{
    time: string;
    cpu: number;
    memory: number;
    connections: number;
    queriesPerMin: number;
  }>;
}

export interface SlowQuery {
  id: string;
  durationMs: number;
  database: string;
  query: string;
  cpuMs: number;
  reads: number;
  executedAt: string;
}

export interface LargestTable {
  id: string;
  database: string;
  tableName: string;
  rows: number;
  dataSizeMb: number;
  indexSizeMb: number;
  totalSizeMb: number;
}

export interface ServerHealth {
  database: string;
  server: string;
  status: 'Online' | 'Warning' | 'Offline';
  latencyMs: number;
  connections: number;
  lastBackup: string;
  sizeGb: number;
}
