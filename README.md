# DBHub – Enterprise Database Management Platform

DBHub là nền tảng quản trị cơ sở dữ liệu doanh nghiệp (SQL Server) thông qua giao diện Web hiện đại, hiệu năng cao, trực quan và chuẩn Data-dense. 

Dự án bao gồm hai phần:
- **Frontend**: Xây dựng bằng **React + TypeScript + Vite + Ant Design**, thiết kế theo tiêu chuẩn của các nền tảng quản trị cao cấp (Azure Portal, Vercel Dashboard, SSMS) kèm hỗ trợ đa ngôn ngữ Tiếng Việt (`vi_VN`) & English.
- **Backend (Phase 2)**: Xây dựng bằng **ASP.NET Core 10 Web API + Dapper + Microsoft.Data.SqlClient** kết nối trực tiếp đến **SQL Server**, hoạt động ở chế độ **Read-Only** bảo mật cao với cơ chế phòng thủ SQL Injection toàn diện.

---

## 1. Yêu cầu hệ thống (Prerequisites)

- **Node.js**: `v18.0.0` trở lên (Khuyến nghị `v20+`)
- **.NET SDK**: `v10.0` trở lên (hoặc .NET 8/9/10 tương thích)
- **SQL Server**: SQL Server 2016 trở lên hoặc Azure SQL Database
- Trình duyệt hiện đại: Chrome, Edge, Firefox, Safari

---

## 2. Hướng dẫn cài đặt & Khởi chạy (Quick Start)

Mở 2 cửa sổ terminal riêng biệt:

### Terminal 1: Khởi chạy ASP.NET Core Backend (Port 5000)

```bash
# Di chuyển vào thư mục API
cd backend/DBHub.Api

# Khởi chạy ứng dụng .NET
dotnet run
```

Backend sẽ khởi động tại: `http://localhost:5000` (Swagger UI: `http://localhost:5000/swagger`).

### Terminal 2: Khởi chạy React Frontend (Port 3000)

```bash
# Tại thư mục gốc của dự án:
npm install

# Khởi chạy frontend Vite
npm run dev
```

Ứng dụng Frontend sẽ chạy tại địa chỉ: `http://localhost:3000`.

Vite dev server đã được cấu hình tự động proxy các request `/api/*` tới `http://localhost:5000`.

---

## 3. Kiến trúc hệ thống (Architecture)

```text
React 18 + Vite (Port 3000)
       │
       │ HTTP / JSON (Proxy /api)
       ▼
ASP.NET Core 10 Web API (Port 5000)
  ├── Controllers
  │    ├── DatabaseConnectionsController (/api/database-connections)
  │    ├── DatabasesController (/api/connections/{id}/databases)
  │    ├── MetadataController (/api/connections/{id}/databases/{db}/...)
  │    ├── TableDataController (/api/connections/{id}/databases/{db}/tables/{sch}/{tbl}/rows)
  │    └── HealthController (/health, /api/health)
  │
  ├── Services & Infrastructure
  │    ├── SqlIdentifierValidator (Whitelist Regex & SQL Injection Defense)
  │    ├── SqlConnectionFactory (SqlConnectionStringBuilder)
  │    ├── SqlServerMetadataService (System catalog views + MemoryCache)
  │    ├── TableDataQueryService (OFFSET FETCH Paging, Sorting & Dynamic Filters)
  │    └── JsonDatabaseConnectionStore (Persistent App_Data/connections.json)
  │
  └── SQL Server Instance
       ├── System Catalogs (sys.databases, sys.tables, sys.columns, sys.indexes, sys.foreign_keys)
       └── User Tables & Views
```

---

## 4. Các tính năng chính của Phase 2 (Read-Only Integration)

1. **Quản lý kết nối SQL Server (Database Connections)**:
   - Thêm cấu hình kết nối mới: Server, Port, Database, Authentication (SQL Server / Windows), Username, Password, SSL Encrypt, Trust Server Certificate.
   - Lưu trữ danh sách kết nối an toàn (mật khẩu không bao giờ được trả về API hay xuất ra log).
   - **Đo độ trễ thực tế (Real Latency Measurement)**: Test connection trực tiếp với SQL Server bằng `Stopwatch` và trả về thời gian phản hồi (ms) cùng phiên bản SQL Server.
2. **Khám phá Metadata (Database Explorer)**:
   - Liệt kê danh sách database người dùng (loại trừ các database hệ thống như `master`, `tempdb`, `model`, `msdb`).
   - Liệt kê toàn bộ Tables (kèm thống kê số dòng `RowCount`), Views, Stored Procedures.
   - Truy vấn chi tiết cấu trúc bảng: Columns (Tên, DataType, MaxLength, Nullable, Primary Key, Identity), Indexes (Clustered/Non-Clustered, Unique, Columns), Relationships (Foreign Keys).
3. **Truy vấn dữ liệu bảng (Table Data Viewer)**:
   - Phân trang phía Server (`OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY`).
   - Sắp xếp động theo bất kỳ cột nào (`ORDER BY [Column] ASC/DESC`).
   - Tìm kiếm toàn văn nhanh (Global Search across text columns).
   - Bộ lọc có cấu trúc (Filter Builder: equals, contains, startsWith, >, <, between, isTrue, isFalse, dates...).
4. **Phòng thủ SQL Injection nghiêm ngặt**:
   - Mọi định danh (`database`, `schema`, `table`, `column`, `sortDirection`) đều được kiểm tra qua `SqlIdentifierValidator` với regex whitelist nghiêm ngặt trước khi quote `[ ]`.
   - 100% giá trị tìm kiếm và bộ lọc được chuyển thành `Dapper.DynamicParameters`. Không sử dụng phép ghép chuỗi thô.
   - Giới hạn kích thước trang (`PageSize` từ 1 đến 500 dòng).
5. **Chế độ Chỉ đọc (Read-Only Enforcement)**:
   - Tuyệt đối không hỗ trợ `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, hoặc thực thi arbitrary SQL trong Phase này.
   - Frontend hiển thị nhãn `Phase 2: Read-Only` và ngăn chặn các hành vi ghi dữ liệu lên database thật.
6. **Chế độ dữ liệu linh hoạt (Fallback & Toggle)**:
   - Cấu hình qua biến môi trường `.env` (`VITE_DATA_SOURCE=api` hoặc `VITE_DATA_SOURCE=mock`).
   - Khi kết nối backend gặp gián đoạn hoặc chưa có máy chủ SQL Server thật, hệ thống tự động fallback về bộ mock data phong phú (`NhanVienDaiThanh` 120+ dòng, 8 databases mẫu) giúp demo không bị gián đoạn.

---

## 5. Danh sách API Endpoints chính

| Phương thức | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/health` hoặc `/api/health` | Health check hệ thống |
| `GET` | `/api/database-connections` | Lấy danh sách kết nối (ẩn mật khẩu) |
| `POST` | `/api/database-connections` | Tạo mới cấu hình kết nối SQL Server |
| `GET` | `/api/database-connections/{id}` | Lấy chi tiết 1 kết nối |
| `DELETE` | `/api/database-connections/{id}` | Xóa 1 cấu hình kết nối |
| `POST` | `/api/database-connections/test` | Kiểm tra kết nối và đo latency |
| `POST` | `/api/database-connections/{id}/test` | Kiểm tra lại kết nối đã lưu |
| `GET` | `/api/connections/{id}/databases` | Danh sách database trên server |
| `GET` | `/api/connections/{id}/databases/{db}/tables` | Danh sách bảng trong database |
| `GET` | `/api/connections/{id}/databases/{db}/views` | Danh sách views trong database |
| `GET` | `/api/connections/{id}/databases/{db}/procedures` | Danh sách stored procedures |
| `GET` | `/api/connections/{id}/databases/{db}/tables/{sch}/{tbl}/columns` | Cấu trúc cột |
| `GET` | `/api/connections/{id}/databases/{db}/tables/{sch}/{tbl}/indexes` | Danh sách indexes |
| `GET` | `/api/connections/{id}/databases/{db}/tables/{sch}/{tbl}/relationships` | Danh sách Foreign Keys |
| `POST` | `/api/connections/{id}/databases/{db}/tables/{sch}/{tbl}/rows/query` | Lấy dữ liệu phân trang, lọc, sắp xếp |

---

## 6. Kiểm thử tự động (Unit Tests)

Chạy bộ kiểm thử tự động của Backend:

```bash
dotnet test backend/DBHub.slnx
```

Bộ unit tests trong `DBHub.Tests` bao quát:
- Whitelist validation cho SQL identifier hợp lệ (chữ cái, số, `@`, `#`, `_`).
- Chặn đứng các nguy cơ SQL Injection (chứa dấu chấm phẩy, comment `--`, `/* */`, quotes, từ khóa nguy hiểm `DROP TABLE`, `1=1; SELECT...`).
- Kiểm tra chuẩn hóa hướng sắp xếp (`ASC`/`DESC`).
- Kiểm tra ràng buộc phân trang (bounds: Page $\ge 1$, PageSize từ 1 đến 500).

---

## 7. Giấy phép (License)

Dự án phát triển nội bộ cho doanh nghiệp – Bản quyền thuộc về đội ngũ phát triển DBHub.
