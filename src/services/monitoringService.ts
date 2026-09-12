import {
  LargestTable,
  ServerHealth,
  ServerMetric,
  SlowQuery,
} from '@/types/monitoring';
import {
  mockLargestTables,
  mockServerHealthList,
  mockServerMetrics,
  mockSlowQueries,
} from '@/mocks/monitoring.mock';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class MonitoringService {
  async getMetrics(): Promise<ServerMetric> {
    await delay(200);
    return { ...mockServerMetrics };
  }

  async getSlowQueries(): Promise<SlowQuery[]> {
    await delay(200);
    return [...mockSlowQueries];
  }

  async getLargestTables(): Promise<LargestTable[]> {
    await delay(150);
    return [...mockLargestTables];
  }

  async getServerHealth(): Promise<ServerHealth[]> {
    await delay(150);
    return [...mockServerHealthList];
  }
}

export const monitoringService = new MonitoringService();
