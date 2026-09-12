# DBHub – Enterprise Database Management Platform

DBHub là nền tảng quản trị cơ sở dữ liệu doanh nghiệp (SQL Server) thông qua giao diện Web hiện đại, hiệu năng cao, trực quan và chuẩn Data-dense. 

Dự án bao gồm:
- **Frontend**: Xây dựng bằng **React + TypeScript + Vite + Ant Design**, thiết kế theo tiêu chuẩn của các nền tảng quản trị cao cấp (Azure Portal, Vercel Dashboard, SSMS) kèm hỗ trợ đa ngôn ngữ Tiếng Việt (`vi_VN`) & English.
- **Backend**: Xây dựng bằng **ASP.NET Core 10 Web API + Dapper + Microsoft.Data.SqlClient**, tích hợp hệ thống xác thực bảo mật JWT, phân quyền tài nguyên RBAC chi tiết và cơ chế **Dynamic Generic CRUD** hoàn toàn dựa trên metadata của SQL Server.

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
Vite dev server tự động proxy các request `/api/*` tới backend `http://localhost:5000`.

---

## 3. Kiến trúc hệ thống (Architecture)

```text
React 18 + TypeScript + Ant Design v5 (Port 3000)
       │
       │ HTTP / JSON (Proxy /api) kèm JWT Bearer Token
       ▼
ASP.NET Core 10 Web API (Port 5000)
  ├── Middleware & Security
  │    ├── JwtAuthentication (Access Token + Refresh Token Rotation)
  │    ├── GlobalExceptionFilter (Map SQL Server error codes: 2601, 547, 8152, 515, 1205)
  │    ├── SqlIdentifierValidator (Whitelist Regex & Strict Quoting [schema].[table])
  │    └── PermissionService (Resource-Level RBAC: Connection / Database / Table scope)
  │
  ├── Dynamic CRUD Engine
  │    ├── SqlServerMetadataService (Columns, PK, Precision, Scale, Computed, RowVersion)
  │    ├── DynamicCrudSqlBuilder (100% Parameterized queries, No Raw SQL from Client)
  │    ├── SqlValueConverter (Type conversion, MaxLength, Decimal scale, Default omission)
  │    ├── DynamicCrudService (Atomic SqlTransaction, Single-row affected check, No-Op check)
  │    └── AuditService (Before/After diffs, Sensitive column masking: password, secret, token)
  │
  └── Database Layer
       ├── App Database: SQLite (Users, Roles, Permissions, Refresh Tokens, Audit Events)
       └── Target Database: SQL Server 2016-2025 / Azure SQL
```

---

## 4. Các tính năng cốt lõi theo giai đoạn

### Phase 2: SQL Server Read-Only Foundation
- **Quản lý kết nối**: Cấu hình SQL Server, đo độ trễ mạng thực tế (`Stopwatch`), mã hóa mật khẩu an toàn.
- **Khám phá Metadata**: Duyệt cây đối tượng (Databases, Tables, Views, Stored Procedures, Columns, Indexes, Foreign Keys).
- **Table Data Browser**: Phân trang Server-side (`OFFSET FETCH`), tìm kiếm toàn văn, bộ lọc đa điều kiện, sắp xếp động.
- **SQL Injection Defense**: Whitelist regex định danh, 100% tham số hóa qua Dapper, không bao giờ dùng chuỗi thô.

### Phase 3: Authentication + JWT + RBAC
- **Xác thực an toàn**: Đăng nhập, đăng xuất, JWT Access Token (ngắn hạn) + Refresh Token (bảo vệ bằng rotation và thu hồi).
- **Phân quyền RBAC đa cấp**: Phân quyền hệ thống và phân quyền theo phạm vi tài nguyên (Resource Scope: Connection, Database, Table).
- **Audit Logging**: Ghi nhận toàn bộ thao tác đăng nhập, làm mới token, truy cập tài nguyên vào bảng kiểm toán.

### Phase 4: Dynamic Generic CRUD Engine
- **Thực thi CRUD động**: `INSERT`, `UPDATE`, `DELETE`, và `Bulk Delete` hoạt động trên bất kỳ bảng SQL Server nào mà không cần viết code riêng cho từng bảng.
- **Dynamic Ant Design Form**:
  - Tự động sinh giao diện nhập liệu từ metadata cột (Input, InputNumber, Switch, DatePicker, Select/Lookup).
  - Tự động đánh dấu trường bắt buộc (`Nullable = false`).
  - Giới hạn độ dài nhập liệu dựa trên `MaxLength`.
  - Validate số chữ số nguyên và thập phân theo `Precision` và `Scale` của SQL Server.
- **Bảo vệ toàn vẹn dữ liệu & Ràng buộc an toàn**:
  - **Chỉ bảng vật lý (Base Tables)**: Không cho phép thao tác ghi trên Views.
  - **Bắt buộc Primary Key**: Bảng phải có Primary Key để bảo đảm xác định chính xác dòng dữ liệu.
  - **Khóa chuyển đổi (AllowWrite Toggle)**: Nếu kết nối tắt `AllowWrite`, mọi thao tác ghi đều bị chặn với mã lỗi `WRITE_DISABLED`.
  - **Bảo vệ bảng hệ thống**: Cấu hình `DynamicCrud:ProtectedTables` ngăn chặn chỉnh sửa trực tiếp các bảng nhạy cảm.
  - **Bảo vệ cột đặc biệt**: Tự động bỏ qua các cột `IsIdentity`, `IsComputed`, và `IsRowVersion` khi ghi; tự động tận dụng `DEFAULT` constraint của SQL Server khi người dùng không truyền giá trị.
  - **Single Row Affected Check**: Mọi thao tác UPDATE và DELETE đơn dòng kiểm tra chặt chẽ `AffectedRows == 1`. Nếu là 0 hoặc > 1, transaction lập tức rollback và ném lỗi an toàn.
  - **No-Op Update Detection**: Tự động so sánh dữ liệu mới và cũ bằng `AreValuesEqual`. Nếu không có trường nào thay đổi, hệ thống trả về thành công ngay mà không tốn lệnh SQL UPDATE và không sinh log rác.
  - **Optimistic Concurrency**: Hỗ trợ kiểm tra phiên bản dòng dữ liệu thông qua cột kiểu `rowversion` / `timestamp`. Nếu dữ liệu đã bị thay đổi bởi người dùng khác, hệ thống báo lỗi `CONCURRENCY_CONFLICT` (409).
  - **Xóa hàng loạt (Bulk Delete)**: Giới hạn an toàn tối đa 100 dòng mỗi mẻ, bọc trong giao dịch nguyên tử.
  - **Cảnh báo môi trường Production**: Hiển thị hộp thoại cảnh báo nghiêm ngặt khi thực hiện thao tác xóa trên các cơ sở dữ liệu Production.
  - **Nhật ký Before / After**: Ghi nhận chi tiết snapshot trước và sau khi sửa/xóa vào bảng Audit, tự động che mờ (mask) các trường nhạy cảm như mật khẩu, token, secret.

---

## 5. Bảng ánh xạ kiểu dữ liệu (SQL Server Data Types)

| Kiểu dữ liệu SQL Server | Kiểm tra & Chuyển đổi | Thành phần giao diện (Frontend) |
|---|---|---|
| `nvarchar`, `varchar`, `nchar`, `char`, `text` | Kiểm tra MaxLength, Trim chuỗi | `Input` / `Input.TextArea` |
| `int`, `bigint`, `smallint`, `tinyint` | Parse số nguyên | `InputNumber` (step = 1) |
| `decimal`, `numeric`, `money`, `smallmoney` | Parse số thập phân, kiểm tra Precision & Scale | `InputNumber` (phù hợp scale) |
| `float`, `real` | Parse số thực | `InputNumber` |
| `bit` | Chuyển đổi boolean (`true`/`false`, `1`/`0`) | `Switch` |
| `date`, `datetime`, `datetime2`, `smalldatetime` | Parse ISO-8601 DateTime | `DatePicker` |
| `time` | Parse TimeSpan | `TimePicker` |
| `uniqueidentifier` | Validate định dạng `Guid` | `Input` (Placeholder UUID) |
| `varbinary`, `binary`, `image` | Parse Base64 / Hex | `Input` |
| `rowversion`, `timestamp` | Đọc dạng Hex string, readonly | Không cho phép nhập, dùng cho Concurrency |

---

## 6. Danh sách API Endpoints chính

### Phase 2: Connections & Explorer
| Phương thức | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/database-connections` | Lấy danh sách kết nối (ẩn mật khẩu) |
| `POST` | `/api/database-connections` | Tạo mới cấu hình kết nối SQL Server |
| `POST` | `/api/database-connections/test` | Kiểm tra kết nối và đo độ trễ |
| `GET` | `/api/connections/{id}/databases` | Danh sách database trên máy chủ |
| `GET` | `/api/connections/{id}/databases/{db}/tables` | Danh sách bảng dữ liệu |
| `POST` | `/api/connections/{id}/databases/{db}/tables/{sch}/{tbl}/rows/query` | Lấy dữ liệu phân trang, lọc, sắp xếp |

### Phase 3: Auth & RBAC
| Phương thức | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/auth/login` | Đăng nhập hệ thống, nhận JWT Access Token |
| `POST` | `/api/auth/refresh-token` | Làm mới Access Token bằng Refresh Token |
| `GET` | `/api/auth/me` | Lấy thông tin user hiện tại và danh sách quyền |
| `GET` | `/api/users` | Quản lý người dùng hệ thống |
| `GET` | `/api/roles` | Quản lý vai trò và phân quyền |
| `GET` | `/api/audit-logs` | Xem nhật ký kiểm toán hệ thống |

### Phase 4: Dynamic Generic CRUD
| Phương thức | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/connections/{id}/databases/{db}/tables/{sch}/{tbl}/capabilities` | Kiểm tra quyền ghi và điều kiện của bảng |
| `POST` | `/api/connections/{id}/databases/{db}/tables/{sch}/{tbl}/rows/by-key` | Lấy chi tiết 1 dòng dữ liệu theo Primary Key |
| `POST` | `/api/connections/{id}/databases/{db}/tables/{sch}/{tbl}/rows` | Thêm mới dòng dữ liệu (`INSERT`) |
| `PUT`, `PATCH`| `/api/connections/{id}/databases/{db}/tables/{sch}/{tbl}/rows` | Cập nhật dòng dữ liệu (`UPDATE`) |
| `DELETE` | `/api/connections/{id}/databases/{db}/tables/{sch}/{tbl}/rows` | Xóa dòng dữ liệu (`DELETE`) |
| `POST` | `/api/connections/{id}/databases/{db}/tables/{sch}/{tbl}/rows/bulk-delete` | Xóa hàng loạt dòng dữ liệu (tối đa 100 dòng) |
| `GET` | `/api/connections/{id}/databases/{db}/tables/{sch}/{tbl}/lookups/{column}` | Lấy danh sách gợi ý dữ liệu cho cột Foreign Key |
| `GET` | `/api/connections/{id}/databases/{db}/tables/{sch}/{tbl}/rows/history` | Xem lịch sử thay đổi Before/After của dòng |

---

## 7. Kiểm thử tự động (Unit Tests)

Chạy bộ kiểm thử tự động của Backend:

```bash
dotnet test backend/DBHub.slnx
```

Bộ unit tests trong `DBHub.Tests` (78 tests) bao quát:
- Whitelist validation cho SQL identifier hợp lệ (chống SQL Injection).
- Trình sinh câu lệnh động `DynamicCrudSqlBuilder` (Insert, Update, Delete, Bulk Delete, Lookup, Select explicit columns).
- Trình chuyển đổi và thẩm định kiểu dữ liệu `SqlValueConverter` (kiểm tra độ dài, nullability, precision/scale, identity/default omission).
- Cơ chế phát hiện No-Op Update `AreValuesEqual`.
- Xử lý mã lỗi SQL Server trong `GlobalExceptionFilter` (2601 Duplicate Key, 547 FK Violation, 8152 Data Too Long, 515 Null Not Allowed, 1205 Deadlock).

---

## 8. Giấy phép (License)

Dự án phát triển nội bộ cho doanh nghiệp – Bản quyền thuộc về đội ngũ phát triển DBHub.
