import {
  LargestTable,
  ServerHealth,
  ServerMetric,
  SlowQuery,
} from '@/types/monitoring';

export const mockServerMetrics: ServerMetric = {
  cpuUsage: 42,
  memoryUsage: 68,
  activeConnections: 42,
  queriesPerSecond: 24,
  databaseSizeGb: 482,
  history: [
    { time: '14:00', cpu: 28, memory: 62, connections: 35, queriesPerMin: 1200 },
    { time: '14:05', cpu: 35, memory: 63, connections: 38, queriesPerMin: 1350 },
    { time: '14:10', cpu: 48, memory: 65, connections: 45, queriesPerMin: 1580 },
    { time: '14:15', cpu: 52, memory: 67, connections: 49, queriesPerMin: 1690 },
    { time: '14:20', cpu: 39, memory: 66, connections: 40, queriesPerMin: 1420 },
    { time: '14:25', cpu: 45, memory: 68, connections: 43, queriesPerMin: 1510 },
    { time: '14:30', cpu: 42, memory: 68, connections: 42, queriesPerMin: 1482 },
  ],
};

export const mockSlowQueries: SlowQuery[] = [
  {
    id: 'sq-1',
    durationMs: 4250,
    database: 'PMSC Production',
    query: `SELECT e.MaNhanVien, e.Name, d.DeptName, COUNT(p.TicketNo) as TotalTickets
FROM dbo.NhanVienDaiThanh e
JOIN dbo.Departments d ON e.DeptName0 = d.DeptName
LEFT JOIN dbo.HQ_PhieuCan p ON p.OperatorCode = e.MaNhanVien
GROUP BY e.MaNhanVien, e.Name, d.DeptName
ORDER BY TotalTickets DESC;`,
    cpuMs: 3890,
    reads: 142580,
    executedAt: '2024-05-21 14:22:10',
  },
  {
    id: 'sq-2',
    durationMs: 3120,
    database: 'ERP Production',
    query: `SELECT o.OrderCode, c.CustomerName, SUM(i.Quantity * i.UnitPrice) as TotalAmount
FROM dbo.ProductionOrders o
JOIN dbo.Customers c ON o.CustomerId = c.Id
JOIN dbo.OrderItems i ON o.Id = i.OrderId
WHERE o.OrderDate >= DATEADD(month, -6, GETDATE())
GROUP BY o.OrderCode, c.CustomerName;`,
    cpuMs: 2980,
    reads: 89400,
    executedAt: '2024-05-21 14:18:45',
  },
  {
    id: 'sq-3',
    durationMs: 2450,
    database: 'PMSC Production',
    query: `SELECT * FROM dbo.AuditLogs WHERE Action = 'UPDATE' AND timestamp >= '2024-05-01' ORDER BY timestamp DESC;`,
    cpuMs: 2200,
    reads: 65120,
    executedAt: '2024-05-21 13:58:02',
  },
  {
    id: 'sq-4',
    durationMs: 1890,
    database: 'Reporting Database',
    query: `EXEC dbo.sp_GenerateMonthlyReport @Month = 4, @Year = 2024, @IncludeDetails = 1;`,
    cpuMs: 1750,
    reads: 54100,
    executedAt: '2024-05-21 13:30:15',
  },
];

export const mockLargestTables: LargestTable[] = [
  {
    id: 'lt-1',
    database: 'PMSC Production',
    tableName: 'dbo.AuditLogs',
    rows: 654200,
    dataSizeMb: 210.0,
    indexSizeMb: 54.0,
    totalSizeMb: 264.0,
  },
  {
    id: 'lt-2',
    database: 'PMSC Production',
    tableName: 'dbo.NhanVienDaiThanh',
    rows: 326842,
    dataSizeMb: 142.5,
    indexSizeMb: 38.2,
    totalSizeMb: 180.7,
  },
  {
    id: 'lt-3',
    database: 'HR Database',
    tableName: 'dbo.AttendanceLogs',
    rows: 185000,
    dataSizeMb: 42.0,
    indexSizeMb: 11.2,
    totalSizeMb: 53.2,
  },
  {
    id: 'lt-4',
    database: 'Weigh Station',
    tableName: 'dbo.HQ_PhieuCan',
    rows: 82420,
    dataSizeMb: 68.4,
    indexSizeMb: 19.5,
    totalSizeMb: 87.9,
  },
  {
    id: 'lt-5',
    database: 'PMSC Production',
    tableName: 'dbo.HQ_PhieuCanNhapNguyenLieu',
    rows: 54100,
    dataSizeMb: 45.2,
    indexSizeMb: 12.8,
    totalSizeMb: 58.0,
  },
];

export const mockServerHealthList: ServerHealth[] = [
  {
    database: 'PMSC Production',
    server: 'DB-SRV-01',
    status: 'Online',
    latencyMs: 8,
    connections: 24,
    lastBackup: 'Today at 02:00 AM',
    sizeGb: 482,
  },
  {
    database: 'HR Database',
    server: 'DB-SRV-02',
    status: 'Online',
    latencyMs: 12,
    connections: 8,
    lastBackup: 'Today at 03:30 AM',
    sizeGb: 85,
  },
  {
    database: 'Weigh Station',
    server: 'DB-SRV-03',
    status: 'Warning',
    latencyMs: 45,
    connections: 6,
    lastBackup: 'Yesterday at 11:00 PM',
    sizeGb: 42,
  },
  {
    database: 'Backup Server',
    server: 'DB-SRV-04',
    status: 'Offline',
    latencyMs: 0,
    connections: 0,
    lastBackup: '3 days ago',
    sizeGb: 500,
  },
];
