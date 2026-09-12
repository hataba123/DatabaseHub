import { AuditLog } from '@/types/audit';
import { mockAuditLogs } from '@/mocks/audit.mock';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface AuditLogFilterParams {
  user?: string;
  database?: string;
  table?: string;
  action?: string;
  dateRange?: [string, string];
  search?: string;
}

class AuditService {
  private logs: AuditLog[] = [...mockAuditLogs];

  async getLogs(filters?: AuditLogFilterParams): Promise<AuditLog[]> {
    await delay(250);
    let items = [...this.logs];

    if (filters?.user) {
      items = items.filter((log) => log.user.toLowerCase().includes(filters.user!.toLowerCase()));
    }
    if (filters?.database && filters.database !== 'All') {
      items = items.filter((log) => log.database.toLowerCase() === filters.database!.toLowerCase());
    }
    if (filters?.table) {
      items = items.filter((log) => log.table.toLowerCase().includes(filters.table!.toLowerCase()));
    }
    if (filters?.action && filters.action !== 'All') {
      items = items.filter((log) => log.action === filters.action);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (log) =>
          log.recordKey.toLowerCase().includes(q) ||
          log.user.toLowerCase().includes(q) ||
          log.table.toLowerCase().includes(q)
      );
    }

    return items;
  }
}

export const auditService = new AuditService();
