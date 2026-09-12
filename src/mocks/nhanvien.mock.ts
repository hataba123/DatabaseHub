export interface NhanVienRecord {
  MaNhanVien: string;
  Name: string;
  Xuong: number;
  DeptName0: string;
  BirthDate: string;
  Tel: string;
  Address: string;
  IsDisplay: boolean;
  Status: 'Đang Làm' | 'Nghỉ Phép' | 'Thử Việc' | 'Đã Nghỉ';
  SalaryGrade: string;
  JoinedDate: string;
}

const firstNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const middleNames = ['Văn', 'Thị', 'Thành', 'Quốc', 'Đức', 'Hữu', 'Minh', 'Ngọc', 'Gia', 'Bảo', 'Kim', 'Xuân', 'Đình', 'Hoàng'];
const lastNames = ['Ký', 'Sang', 'Minh', 'Lan', 'Huy', 'Tuấn', 'Dũng', 'Thảo', 'Trang', 'Phúc', 'Tâm', 'Hải', 'Hòa', 'Cường', 'Duy', 'Phương', 'Linh', 'Tiến', 'Vinh', 'Long'];

const departments = [
  'Nhóm SC14-AD',
  'Nhóm SC15-AD',
  'Tổ Cơ Khí 1',
  'Tổ Hàn Cắt 2',
  'Phòng Kỹ Thuật',
  'Phòng KCS / QC',
  'Bộ Phận Kho Vận',
  'Tổ Lắp Ráp 3',
  'Xưởng Gia Công Ép',
  'Ban Bảo Trì',
];

const provinces = [
  'TP. Hồ Chí Minh',
  'Bình Dương',
  'Đồng Nai',
  'Long An',
  'Tây Ninh',
  'Tiền Giang',
  'Bà Rịa - Vũng Tàu',
  'Cần Thơ',
  'Bến Tre',
];

export const mockNhanVienList: NhanVienRecord[] = [
  {
    MaNhanVien: 'AD38877',
    Name: 'Lê Thành Ký',
    Xuong: 2,
    DeptName0: 'Nhóm SC14-AD',
    BirthDate: '1989-05-14',
    Tel: '0918342119',
    Address: 'TP. Hồ Chí Minh',
    IsDisplay: true,
    Status: 'Đang Làm',
    SalaryGrade: 'B2',
    JoinedDate: '2018-03-15',
  },
  {
    MaNhanVien: 'AD38904',
    Name: 'Bùi Thị Tuyết Sang',
    Xuong: 2,
    DeptName0: 'Nhóm SC15-AD',
    BirthDate: '1992-11-20',
    Tel: '0903881294',
    Address: 'Bình Dương',
    IsDisplay: true,
    Status: 'Đang Làm',
    SalaryGrade: 'A3',
    JoinedDate: '2019-07-01',
  },
  {
    MaNhanVien: 'AD39001',
    Name: 'Nguyễn Văn Minh',
    Xuong: 1,
    DeptName0: 'Tổ Cơ Khí 1',
    BirthDate: '1985-02-18',
    Tel: '0937123901',
    Address: 'Đồng Nai',
    IsDisplay: true,
    Status: 'Đang Làm',
    SalaryGrade: 'C1',
    JoinedDate: '2016-09-10',
  },
  {
    MaNhanVien: 'AD39002',
    Name: 'Trần Thị Lan',
    Xuong: 3,
    DeptName0: 'Phòng KCS / QC',
    BirthDate: '1994-08-25',
    Tel: '0988223344',
    Address: 'TP. Hồ Chí Minh',
    IsDisplay: true,
    Status: 'Đang Làm',
    SalaryGrade: 'A2',
    JoinedDate: '2020-01-15',
  },
  {
    MaNhanVien: 'AD39003',
    Name: 'Phạm Quốc Huy',
    Xuong: 1,
    DeptName0: 'Phòng Kỹ Thuật',
    BirthDate: '1990-12-04',
    Tel: '0977665544',
    Address: 'Long An',
    IsDisplay: false,
    Status: 'Nghỉ Phép',
    SalaryGrade: 'B3',
    JoinedDate: '2017-05-20',
  },
];

// Generate deterministic realistic 115 more records to reach 120 rows
for (let i = 4; i < 120; i++) {
  const codeNum = 39000 + i;
  const fn = firstNames[i % firstNames.length];
  const mn = middleNames[(i * 3) % middleNames.length];
  const ln = lastNames[(i * 7) % lastNames.length];
  const name = `${fn} ${mn} ${ln}`;
  const xuong = (i % 5) + 1;
  const dept = departments[i % departments.length];
  const birthYear = 1978 + (i % 25);
  const birthMonth = String((i % 12) + 1).padStart(2, '0');
  const birthDay = String((i % 28) + 1).padStart(2, '0');
  const telNum = `09${(i * 37 + 10000000).toString().substring(0, 8)}`;
  const addr = provinces[i % provinces.length];
  const isDisp = i % 7 !== 0;
  
  let status: NhanVienRecord['Status'] = 'Đang Làm';
  if (i % 19 === 0) status = 'Nghỉ Phép';
  else if (i % 23 === 0) status = 'Thử Việc';
  else if (i % 31 === 0) status = 'Đã Nghỉ';

  const grades = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2'];
  const grade = grades[i % grades.length];
  const joinYear = 2015 + (i % 9);

  mockNhanVienList.push({
    MaNhanVien: `AD${codeNum}`,
    Name: name,
    Xuong: xuong,
    DeptName0: dept,
    BirthDate: `${birthYear}-${birthMonth}-${birthDay}`,
    Tel: telNum,
    Address: addr,
    IsDisplay: isDisp,
    Status: status,
    SalaryGrade: grade,
    JoinedDate: `${joinYear}-0${(i % 9) + 1}-15`,
  });
}
