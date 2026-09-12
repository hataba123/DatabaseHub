# DBHub – Enterprise Database Management Platform (Frontend)

DBHub là nền tảng quản trị cơ sở dữ liệu doanh nghiệp (SQL Server) thông qua giao diện Web hiện đại, hiệu năng cao, trực quan và chuẩn Data-dense. 

Giao diện được xây dựng bằng **React + TypeScript + Vite + Ant Design**, thiết kế theo tiêu chuẩn của các nền tảng quản trị cao cấp như Azure Portal, Vercel Dashboard, GitLab Admin, và SQL Server Management Studio (SSMS).

---

## 1. Yêu cầu hệ thống (Requirements)

- **Node.js**: `v18.0.0` trở lên (Khuyến nghị `v20+`)
- **NPM**: `v9.0.0` trở lên hoặc PNPM / Yarn
- Trình duyệt hiện đại: Chrome, Edge, Firefox, Safari

---

## 2. Cài đặt & Chạy ứng dụng (Install & Run)

Chỉ với 2 câu lệnh đơn giản:

```bash
# 1. Cài đặt dependencies
npm install

# 2. Khởi chạy development server
npm run dev
```

Ứng dụng sẽ chạy tại địa chỉ: `http://localhost:3000` (hoặc cổng hiển thị trong terminal).

Để kiểm tra build cho môi trường production:

```bash
npm run build
```

---

## 3. Cấu trúc thư mục (Project Structure)

```text
src/
│
├── app/
│   ├── router/index.tsx          # Toàn bộ routing theo master spec
│   └── providers/                # QueryClient, Ant Design ConfigProvider (Theme)
│
├── components/
│   ├── common/                   # StatusBadge, MetricCard, PageHeader, EmptyState, JsonViewer
│   ├── data-table/               # Reusable DataTable: sorting, pagination, density, selection
│   ├── database/                 # AddConnectionModal, DatabaseTreeExplorer
│   └── layout/                   # MainLayout, AppHeader, AppSidebar, GlobalSearchModal (Ctrl+K)
│
├── features/
│   ├── dashboard/                # Database Overview, Stats, Activity/Storage Charts, Health table
│   ├── databases/                # Database List (Grid/List), Database Detail (Overview/Tables/Views/Procs)
│   ├── data-browser/             # Table Data Browser, Filter Builder, Column Selector, Row Details, Schema Tab
│   ├── compare/                  # Database Compare & Row Compare side-by-side
│   ├── sync/                     # Database Sync 5-step wizard
│   ├── audit/                    # Audit Logs table, filters, JSON before/after visual diff
│   ├── monitoring/               # System Monitoring metrics, charts, slow queries, largest tables
│   ├── users/                    # User management table & detail drawer
│   ├── roles/                    # Role & Permissions matrix (down to table level)
│   └── settings/                 # Settings sub-nav (Connections, General, Appearance, Security)
│
├── mocks/
│   ├── databases.mock.ts         # 8 databases (PMSC, HR, Weigh Station, ERP, Backup, Dev, Archive)
│   ├── tables.mock.ts            # Tables, Views, Stored Procedures, Schemas
│   ├── nhanvien.mock.ts          # 120+ dòng dữ liệu tiếng Việt thực tế (NhanVienDaiThanh)
│   ├── audit.mock.ts             # Lịch sử thay đổi dữ liệu chi tiết
│   ├── monitoring.mock.ts        # Metrics, slow queries, server health
│   └── users.mock.ts             # Users và ma trận phân quyền
│
├── services/                     # Service Abstraction Layer (dễ dàng thay bằng HTTP API sau này)
│   ├── databaseService.ts
│   ├── tableService.ts
│   ├── compareService.ts
│   ├── auditService.ts
│   ├── monitoringService.ts
│   └── userService.ts
│
├── stores/                       # Zustand store (environment, sidebar collapsed, active DB, search modal)
├── types/                        # TypeScript interfaces & types chuẩn doanh nghiệp
├── utils/                        # Formatters (bytes, dates, numbers) & dynamic filter evaluator
└── styles/                       # Design tokens constants, theme config, global css
```

---

## 4. Dữ liệu mẫu (Realistic Mock Data)

Hệ thống được trang bị bộ mock data sát với thực tế sản xuất tại các nhà máy và doanh nghiệp:

- **Databases**:
  - `PMSC Production` (Online, 482 GB, 326 tables, 42 views, 82 procs)
  - `HR Database` (Online, 85 GB, 64 tables)
  - `Weigh Station` (Warning, 42 GB, trạm cân tải trọng)
  - `ERP Production` (Online, 310 GB)
  - `Reporting Database` (Staging, 195 GB)
  - `PMSC Backup` (Offline Standby, 500 GB)
  - `Testing Database` (Development, 18 GB)
  - `Archive Database` (840 GB)
- **Table Data Browser (`NhanVienDaiThanh`)**:
  - Hơn **120 bản ghi nhân viên Việt Nam** thực tế với họ tên đầy đủ (`Lê Thành Ký`, `Bùi Thị Tuyết Sang`, `Nguyễn Văn Minh`, `Trần Thị Lan`, `Phạm Quốc Huy`, ...), xưởng sản xuất, tổ đội, ngày sinh, số điện thoại, tình trạng làm việc, bậc lương.
  - Hỗ trợ phân trang, tìm kiếm đa cột, bộ lọc động (Filter Builder), ẩn hiện cột (Column Selector), và xem chi tiết (Details, History, Raw JSON).

---

## 5. Các tính năng chính (Main Features)

1. **Enterprise Header & Shell**:
   - Logo DBHub nhận diện cao cấp.
   - Global Search (`Ctrl + K`): Tìm kiếm tức thì cơ sở dữ liệu, bảng, view, stored procedure và điều hướng trực tiếp.
   - Chuyển đổi môi trường trực quan (`Production`, `Staging`, `Development`).
   - Notification popover & thông tin tài khoản người dùng.
   - Sidebar có thể thu gọn mượt mà.
2. **Dashboard**:
   - 5 thẻ thống kê chính: Connected Databases, Active Connections, Queries/min, Slow Queries, Storage Used.
   - Biểu đồ thời gian thực Database Activity (Area Chart) và Storage Breakdown (Bar Chart) bằng Recharts.
   - Bảng Database Health theo dõi latency, trạng thái và kết nối trực tiếp.
3. **Database Management**:
   - Danh sách cơ sở dữ liệu dạng Grid Card hoặc List View.
   - Modal "Add Database Connection" với tính năng "Test Connection" mô phỏng đo độ trễ mạng (latency ping).
   - Trang chi tiết cơ sở dữ liệu với các tab: Overview, Tables, Views, Stored Procedures, Monitoring, Permissions.
4. **Database Explorer & Table Data Browser**:
   - Cây điều hướng đối tượng cơ sở dữ liệu bên trái có tìm kiếm nhanh.
   - Bảng dữ liệu hỗ trợ sắp xếp đa trường, server-style pagination (`Showing 1-25 of 120`).
   - Tùy chỉnh mật độ hiển thị (Density: Compact / Normal / Comfortable).
   - **Filter Builder**: Bộ lọc điều kiện đa kiểu dữ liệu (String: contains, equals, startsWith; Number: =, !=, >, <, between; Boolean: isTrue, isFalse; Date: equals, before, after).
   - **Column Selector Drawer**: Bật/tắt các cột hiển thị trên DataGrid.
   - **Row Details Drawer**: Xem chi tiết bản ghi dạng thẻ, lịch sử thay đổi, và raw JSON viewer kèm tính năng copy nhanh.
   - **Dynamic Row Modal**: Thêm mới và chỉnh sửa bản ghi với form validation.
   - **Schema & Metadata Tab**: Xem cấu trúc Columns (kiểu dữ liệu, Primary Key, Foreign Key), Indexes, và Relationships.
5. **Database Compare & Row Compare**:
   - So sánh chênh lệch giữa Source Database và Target Database.
   - Bảng so sánh số lượng dòng và trạng thái khác biệt (Same, Different, Missing in Target).
   - Modal so sánh từng bản ghi (Side-by-side visual diff) với tính năng đồng bộ 2 chiều (Copy Source → Target, Target → Source).
6. **Database Sync**:
   - Quy trình hướng dẫn 5 bước (Wizard: Select DBs → Compare → Review Changes → Confirm with Safety Warning → Execution Result).
   - Xem trước mã SQL script đồng bộ (`Preview SQL`).
7. **Audit Logs**:
   - Theo dõi toàn bộ lịch sử truy vấn và thay đổi dữ liệu theo người dùng, database, table, action (INSERT, UPDATE, DELETE).
   - Drawer xem Before / After JSON diff được tô màu chuẩn Git diff.
8. **Monitoring & Diagnostics**:
   - Theo dõi CPU, RAM, Active Connections, Queries/sec.
   - Biểu đồ biến thiên hiệu năng theo thời gian.
   - Bảng Slow Queries (T-SQL, duration, reads) và Top các bảng dung lượng lớn nhất.
9. **Users & Role Matrix**:
   - Quản lý danh sách người dùng và cấp phát vai trò (Super Admin, Database Admin, Data Editor, Data Viewer, Auditor).
   - Ma trận phân quyền chi tiết tới từng Database và từng Table nhạy cảm.
10. **Settings**:
    - Quản lý các kết nối đã lưu, cấu hình hệ thống, giao diện (Compact mode, Dark mode beta), bảo mật và cảnh báo.

---

## 6. Sẵn sàng tích hợp Backend (Future Backend Integration)

Mọi thao tác dữ liệu đều đi qua **Service Abstraction Layer** (`src/services/`):
- `databaseService`
- `tableService`
- `compareService`
- `auditService`
- `monitoringService`
- `userService`

Sau này khi xây dựng backend bằng **ASP.NET Core Web API** và kết nối trực tiếp **SQL Server**, đội ngũ phát triển chỉ cần thay thế các hàm trong `src/services/` bằng các lệnh gọi HTTP (`axios` hoặc `fetch`) tương ứng mà không phải tái cấu trúc lại các UI components.
