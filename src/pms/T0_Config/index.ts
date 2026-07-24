/**
 * T0 - CONFIG LAYER
 * Khai báo duy nhất cấu hình hệ thống, legal constants, enums, định mức, endpoints và danh mục loại văn bản & Excel Column Schemas cho các Giai đoạn 1 -> 4.
 */

export * from './firebase';

export const PMS_CONFIG = {
  APP_NAME: 'PMS 2026 - HỆ THỐNG QUẢN LÝ DỰ ÁN ĐẦU TƯ XÂY DỰNG',
  VERSION: '2026.4.0-ENTERPRISE',
  GOOGLE_SHEET_ID: '1PMS_2026_MASTER_DATABASE_SHEET_ID',
  BACKUP_GOOGLE_DRIVE_FOLDER: 'PMS_2026_AUTOMATED_BACKUPS',
  SMART_CA_ENDPOINT: 'https://api.smartca.gov.vn/v1/sign',
  NATIONAL_DB_ENDPOINT: 'https://csdl-xaydung.moc.gov.vn/api/v1/sync',
  MAX_FILE_SIZE_MB: 100, // Hỗ trợ DWG, ZIP, PDF, XLSX up to 100MB cho GĐ 2, 3, 4

  // Căn cứ pháp lý hiện hành 2026
  LEGAL_REFERENCES: {
    LUAT_XAY_DUNG: 'Luật Xây dựng số 135/2025/QH15',
    LUAT_DAU_THAU: 'Luật Đấu thầu số 22/2023/QH15 & NĐ 212/2026/NĐ-CP',
    NGHI_DINH_206: 'Nghị định 206/2026/NĐ-CP (Quản lý chi phí đầu tư xây dựng)',
    NGHI_DINH_207: 'Nghị định 207/2026/NĐ-CP (Quản lý chất lượng & Thi công)',
    NGHI_DINH_210: 'Nghị định 210/2026/NĐ-CP (Hợp đồng xây dựng mẫu & Phụ lục)',
    NGHI_DINH_212: 'Nghị định 212/2026/NĐ-CP (Đấu thầu dự án công)',
    NGHI_DINH_217: 'Nghị định 217/2026/NĐ-CP (Thẩm định & Khởi tạo dự án)',
    NGHI_DINH_193: 'Nghị định 193/2026/NĐ-CP (Quyết toán vốn đầu tư công)',
    THONG_TU_34: 'Thông tư 34/2026/TT-BXD (Phân cấp công trình xây dựng)',
    THONG_TU_38: 'Thông tư 38/2026/TT-BXD (Hệ thống định mức & Giá xây dựng)',
    THONG_TU_39: 'Thông tư 39/2026/TT-BXD (Chuẩn dữ liệu CSDL Quốc gia BXD)',
    THONG_TU_40: 'Thông tư 40/2026/TT-BXD (Quy trình bảo trì công trình)',
    THONG_TU_41: 'Thông tư 41/2026/TT-BXD (Nhật ký thi công điện tử & SmartCA)',
    QUYET_DINH_1040: 'Quyết định 1040/QĐ-BXD (Mẫu hợp đồng xây dựng tiêu chuẩn)',
    QUYET_DINH_1041: 'Quyết định 1041/QĐ-BXD (Bộ đơn giá xây dựng quốc gia)'
  },

  // Định mức chi phí quản lý dự án & tư vấn (% Tổng chi phí xây dựng + thiết bị)
  NORM_RATES: {
    MANAGEMENT_FEE_PCT: 0.0245, // 2.45%
    CONSULTING_FEE_PCT: 0.0415, // 4.15%
    OTHER_EXPENSES_PCT: 0.0180, // 1.80%
    CONTINGENCY_FEE_PCT: 0.0500, // 5.00% (Dự phòng trượt giá & phát sinh)
    VAT_TAX_PCT: 0.10 // 10% VAT
  },

  // Ngưỡng phân loại nhóm dự án (VND) theo Luật 135/2025/QH15 & NĐ 217/2026/NĐ-CP
  PROJECT_GROUP_THRESHOLDS: {
    GROUP_A_MIN_VND: 800_000_000_000,  // Từ 800 tỷ trở lên -> Nhóm A / Quan trọng QG
    GROUP_B_MIN_VND: 120_000_000_000,  // Từ 120 tỷ đến dưới 800 tỷ -> Nhóm B
    BCKTKT_MAX_VND: 15_000_000_000,    // Công trình tôn tạo, sửa chữa, cải tạo quy mô dưới 15 tỷ -> BCKTKT (Thu gọn 1 bước)
  },

  // Cấu hình Google Drive OAuth 2.0 & Storage
  DRIVE_CONFIG: {
    OAUTH_CLIENT_ID: '9876543210-pms2026googleoauthclientid.apps.googleusercontent.com',
    SCOPES: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/userinfo.email'],
    ROOT_USER_FOLDER_NAME: 'PMS_Storage_UserProjects'
  }
} as const;

export const GOOGLE_CLIENT_ID = '9876543210-pms2026googleoauthclientid.apps.googleusercontent.com';

export interface SystemSettings {
  driveRootFolderId: string;
  driveBaseFolderName: string;
  enableAutoDriveShare: boolean;
  lastVerifiedTimestamp?: string;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  driveRootFolderId: '1a2b3c4d5e6f_PMS_DRIVE_ROOT_2026',
  driveBaseFolderName: 'PMS_Storage_UserProjects',
  enableAutoDriveShare: true,
  lastVerifiedTimestamp: '2026-07-23 10:00'
};

export enum UserRole {
  ADMIN = 'ADMIN',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER'
}

export interface UserAccount {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  assignedProjectIds: string[];
  isActive: boolean;
  updatedAt: string;
}

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'usr-001',
    email: 'admin@pms2026.gov.vn',
    passwordHash: 'admin123',
    fullName: 'Quản Trị Viên Hệ Thống',
    role: UserRole.ADMIN,
    assignedProjectIds: ['ALL'],
    isActive: true,
    updatedAt: '2026-07-23 10:00'
  },
  {
    id: 'usr-002',
    email: 'hieuvv@company.com',
    passwordHash: '123456',
    fullName: 'Vũ Văn Hiếu (PM)',
    role: UserRole.PROJECT_MANAGER,
    assignedProjectIds: ['DA-2026-001', 'DA-2026-003'],
    isActive: true,
    updatedAt: '2026-07-23 10:00'
  },
  {
    id: 'usr-003',
    email: 'kethoath@company.com',
    passwordHash: '123456',
    fullName: 'Phạm Thu Hà (Kế Toán)',
    role: UserRole.MEMBER,
    assignedProjectIds: ['DA-2026-001', 'DA-2026-002'],
    isActive: true,
    updatedAt: '2026-07-23 10:00'
  },
  {
    id: 'usr-004',
    email: 'stranger@otherdomain.com',
    passwordHash: '123456',
    fullName: 'Nguyễn Khách Hàng',
    role: UserRole.VIEWER,
    assignedProjectIds: [],
    isActive: true,
    updatedAt: '2026-07-23 10:00'
  }
];

export enum ProjectGroup {
  NHOM_A = 'NHOM_A',
  NHOM_B = 'NHOM_B',
  NHOM_C = 'NHOM_C',
  BCKTKT = 'BCKTKT'
}

export enum ConstructionGrade {
  CAP_DAC_BIET = 'CAP_DAC_BIET',
  CAP_I = 'CAP_I',
  CAP_II = 'CAP_II',
  CAP_III = 'CAP_III',
  CAP_IV = 'CAP_IV'
}

export enum DesignType {
  THIET_KE_CO_SO = 'THIET_KE_CO_SO',
  THIET_KE_BVTC = 'THIET_KE_BVTC'
}

export enum ApprovalStatus {
  DRAFT = 'DRAFT',
  INTERNAL_REVIEW = 'INTERNAL_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum ProcurementMethod {
  DAU_THAU_RONG_RAI = 'DAU_THAU_RONG_RAI',
  CHI_DINH_THAU_RUT_GON = 'CHI_DINH_THAU_RUT_GON',
  CHI_DINH_THAU_THONG_THUONG = 'CHI_DINH_THAU_THONG_THUONG',
  CHAO_HANG_CANH_TRANH = 'CHAO_HANG_CANH_TRANH'
}

export enum ContractType {
  TRON_GOI = 'TRON_GOI',
  DON_GIA_CO_DINH = 'DON_GIA_CO_DINH',
  DON_GIA_DIEU_CHINH = 'DON_GIA_DIEU_CHINH'
}

export enum GpmbStatus {
  CHO_KIEM_DEM = 'CHỜ_KIỂM_ĐẾM',
  DA_PHE_DUYET_PA = 'ĐÃ_PHÊ_DUYỆT_PA',
  DA_CHI_TRA = 'ĐÃ_CHI_TRẢ',
  DA_BAN_GIAO_MAT_BANG = 'ĐÃ_BÀN_GIAO_MẶT_BẰNG'
}

// STAGE 4 PACKAGE TYPES (Phân loại gói thầu)
export enum PackageType {
  CONSULTING = 'CONSULTING',         // Gói thầu Tư vấn (Khảo sát, Thiết kế, Thẩm tra, Giám sát...)
  CONSTRUCTION = 'CONSTRUCTION',     // Gói thầu Thi công Xây lắp
  EQUIPMENT = 'EQUIPMENT',           // Gói thầu Cung cấp & Lắp đặt Thiết bị
  NON_CONSULTING = 'NON_CONSULTING'  // Phi tư vấn (Bảo hiểm, Rà phá bom mìn, GPMB...)
}

export enum WorkflowStage {
  GIAI_DOAN_1_INITIATION = 1,
  GIAI_DOAN_2_PLANNING_COSTING = 2,
  GIAI_DOAN_3_PROCUREMENT = 3,
  GIAI_DOAN_4_EXECUTION = 4,
  GIAI_DOAN_5_CLOSURE = 5
}

// CẤU TRÚC CỘT EXCEL MẪU SẢN PHẨM TƯ VẤN (EXCEL_CONSULTING_COLUMNS)
export const EXCEL_CONSULTING_COLUMNS = [
  { key: 'productId', header: 'Mã Sản Phẩm / Mốc', example: 'MOC-01', required: true },
  { key: 'productName', header: 'Tên Sản Phẩm / Báo Cáo Tư Vấn', example: 'Hồ sơ bản vẽ thiết kế kỹ thuật thi công', required: true },
  { key: 'deliveryDate', header: 'Ngày Bàn Giao (YYYY-MM-DD)', example: '2026-03-15', required: true },
  { key: 'completionPct', header: 'Tỷ Lệ Hoàn Thành (%)', example: '100', required: true },
  { key: 'allocatedAmount', header: 'Giá Trị Thanh Toán (VND)', example: '4500000000', required: true },
  { key: 'acceptanceReportNo', header: 'Số BB Nghiệm Thu', example: 'BB-NT-01/TV', required: false }
] as const;

// CẤU TRÚC CỘT EXCEL MẪU GPMB (EXCEL_GPMB_COLUMNS)
export const EXCEL_GPMB_COLUMNS = [
  { key: 'householdId', header: 'Mã Hộ / Tổ Chức', example: 'HO-001', required: true },
  { key: 'ownerName', header: 'Họ Và Tên Chủ Hộ / Đại Diện', example: 'Nguyễn Văn An', required: true },
  { key: 'mapPlotNo', header: 'Tờ Bản Đồ / Số Thửa', example: 'TĐ-05/ST-12', required: true },
  { key: 'recoveredArea', header: 'Diện Tích Thu Hồi (m2)', example: '350.5', required: true },
  { key: 'unitPrice', header: 'Đơn Giá Bồi Thường (VND/m2)', example: '12000000', required: true },
  { key: 'status', header: 'Trạng Thái GPMB', example: 'ĐÃ_PHÊ_DUYỆT_PA', required: false }
] as const;

// CẤU TRÚC CỘT EXCEL MẪU KHLCNT (EXCEL_KHLCNT_COLUMNS)
export const EXCEL_KHLCNT_COLUMNS = [
  { key: 'packageId', header: 'Mã Gói Thầu', example: 'GT-01', required: true },
  { key: 'packageName', header: 'Tên Gói Thầu Chi Tiết', example: 'Gói thầu số 01: Thi công XL Cầu & Đường dẫn', required: true },
  { key: 'packagePrice', header: 'Giá Gói Thầu (VND)', example: '880000000000', required: true },
  { key: 'procurementMethod', header: 'Hình Thức LCNT', example: 'DAU_THAU_RONG_RAI', required: true },
  { key: 'contractType', header: 'Loại Hợp Đồng', example: 'DON_GIA_DIEU_CHINH', required: true },
  { key: 'executionMonths', header: 'Thời Gian Thực Hiện (Tháng)', example: '18', required: false }
] as const;

// CẤU TRÚC CỘT EXCEL MẪU KẾ HOẠCH TIẾN ĐỘ (EXCEL_GANTT_COLUMNS)
export const EXCEL_GANTT_COLUMNS = [
  { key: 'taskId', header: 'Mã Công Việc', example: 'TSK-01', required: true },
  { key: 'taskName', header: 'Tên Công Việc Chi Tiết', example: 'Khảo sát địa chất & Thiết kế bản vẽ thi công', required: true },
  { key: 'assignedDept', header: 'Đơn Vị Chủ Trì / Tư Vấn', example: 'Phòng Kỹ thuật & TEDI', required: true },
  { key: 'startDate', header: 'Ngày Bắt Đầu (YYYY-MM-DD)', example: '2026-02-01', required: true },
  { key: 'endDate', header: 'Ngày Hoàn Thành (YYYY-MM-DD)', example: '2026-03-15', required: true },
  { key: 'budgetAllocated', header: 'Ngân Sách Phân Bổ (VND)', example: '15000000000', required: true },
  { key: 'progressPct', header: 'Tiến Độ Hiện Tại (%)', example: '100', required: false }
] as const;

// CẤU TRÚC CỘT EXCEL MẪU DỰ TOÁN BOQ (EXCEL_BOQ_COLUMNS)
export const EXCEL_BOQ_COLUMNS = [
  { key: 'itemCode', header: 'Mã Định Mức BXD', example: 'AF.11111', required: true },
  { key: 'itemName', header: 'Tên Hạng Mục Công Việc', example: 'Đào đất hố móng bằng máy đào 1.25m3', required: true },
  { key: 'unit', header: 'Đơn Vị Tính', example: '100m3', required: true },
  { key: 'quantity', header: 'Khối Lượng Đo Bóc', example: '1500', required: true },
  { key: 'unitPriceVL', header: 'Đơn Giá Vật Liệu (VND)', example: '1200000', required: false },
  { key: 'unitPriceNC', header: 'Đơn Giá Nhân Công (VND)', example: '800000', required: false },
  { key: 'unitPriceM', header: 'Đơn Giá Ca Máy (VND)', example: '500000', required: false },
  { key: 'category', header: 'Phân Loại (XÂY_LẮP / THIẾT_BỊ / QUẢN_LÝ / TƯ_VẤN / KHIÊN_TỔN_DỰ_PHÒNG)', example: 'XÂY_LẮP', required: true }
] as const;

// DANH MỤC TÀI LIỆU VĂN BẢN BẮT BUỘC THEO TỪNG BƯỚC GIAI ĐOẠN 1
export const STAGE1_DOCUMENT_TYPES = [
  {
    stepId: 1,
    stepName: 'Bước 1: Tiếp nhận & Phân công',
    requiredDocs: [
      { docTypeId: 'DOC_CHU_TRUONG', docTypeName: 'Văn bản chủ trương đầu tư', isMandatory: true },
      { docTypeId: 'DOC_PHAN_CONG', docTypeName: 'Quyết định giao nhiệm vụ / Phân công Ban QLDA', isMandatory: true }
    ]
  },
  {
    stepId: 2,
    stepName: 'Bước 2: Khảo sát & Thiết lập bộ máy',
    requiredDocs: [
      { docTypeId: 'DOC_KHAO_SAT', docTypeName: 'Báo cáo khảo sát hiện trạng mặt bằng', isMandatory: true },
      { docTypeId: 'DOC_NHAN_SU', docTypeName: 'Phương án bố trí nhân sự Ban QLDA', isMandatory: true }
    ]
  },
  {
    stepId: 3,
    stepName: 'Bước 3: Lập & Thẩm định BCNCTKT / Đề xuất CTĐƯ',
    requiredDocs: [
      { docTypeId: 'DOC_BCNCTKT', docTypeName: 'Hồ sơ BCNCTKT / BC đề xuất chủ trương đầu tư', isMandatory: true },
      { docTypeId: 'DOC_THAM_DINH_NOI_BO', docTypeName: 'Báo cáo thẩm định nội bộ', isMandatory: true },
      { docTypeId: 'DOC_THAM_DINH_NGANH', docTypeName: 'Báo cáo thẩm định ngành / Bộ Xây dựng', isMandatory: false }
    ]
  },
  {
    stepId: 4,
    stepName: 'Bước 4: Xác định nguồn vốn & Kế hoạch vốn',
    requiredDocs: [
      { docTypeId: 'DOC_CAM_KET_VON', docTypeName: 'Văn bản cam kết / cân đối nguồn vốn', isMandatory: true }
    ]
  },
  {
    stepId: 5,
    stepName: 'Bước 5: Phê duyệt Dự án',
    requiredDocs: [
      { docTypeId: 'DOC_QD_CHU_TRUONG', docTypeName: 'Quyết định phê duyệt Chủ trương đầu tư', isMandatory: true },
      { docTypeId: 'DOC_QD_PHE_DUYET_DA', docTypeName: 'Quyết định phê duyệt Dự án đầu tư xây dựng', isMandatory: true }
    ]
  }
] as const;

// DANH MỤC TÀI LIỆU VĂN BẢN BẮT BUỘC THEO TỪNG BƯỚC GIAI ĐOẠN 2
export const STAGE2_DOCUMENT_TYPES = [
  {
    stepId: 1,
    stepName: 'Bước 1: Lập Kế hoạch Chi tiết & KHLCNT',
    requiredDocs: [
      { docTypeId: 'GDA2_DOC_GANTT_BASELINE', docTypeName: 'Kế hoạch tiến độ tổng thể (File Gantt/Excel)', isMandatory: true },
      { docTypeId: 'GDA2_DOC_NHAN_LUC', docTypeName: 'Kế hoạch phân công nhân sự & nguồn lực', isMandatory: true },
      { docTypeId: 'GDA2_DOC_KHLCNT_TONG_THE', docTypeName: 'Dự thảo Kế hoạch lựa chọn nhà thầu (KHLCNT)', isMandatory: true }
    ]
  },
  {
    stepId: 2,
    stepName: 'Bước 2: Lập Thiết kế & Dự toán BOQ',
    requiredDocs: [
      { docTypeId: 'GDA2_DOC_BCNCKT_BCKTKT', docTypeName: 'Báo cáo NCKT / Báo cáo Kinh tế - Kỹ thuật', isMandatory: true },
      { docTypeId: 'GDA2_DOC_BAN_VE_THIET_KE', docTypeName: 'Hồ sơ bản vẽ thiết kế (File CAD DWG / PDF)', isMandatory: true },
      { docTypeId: 'GDA2_DOC_DU_TOAN_BOQ', docTypeName: 'Tệp tính toán Dự toán chi tiết (BOQ/Excel)', isMandatory: true },
      { docTypeId: 'GDA2_DOC_HOP_DONG_TU_VAN', docTypeName: 'Hợp đồng / Sản phẩm của Tổ chức Tư vấn', isMandatory: false }
    ]
  },
  {
    stepId: 3,
    stepName: 'Bước 3: Thẩm định Nội bộ & Phê duyệt',
    requiredDocs: [
      { docTypeId: 'GDA2_DOC_BC_THAM_DINH_NOI_BO', docTypeName: 'Báo cáo kết quả thẩm định nội bộ', isMandatory: true },
      { docTypeId: 'GDA2_DOC_BC_THAM_TRA_DOC_LAP', docTypeName: 'Báo cáo thẩm tra độc lập (nếu có)', isMandatory: false },
      { docTypeId: 'GDA2_DOC_QD_PHE_DUYET_TK_DT', docTypeName: 'Quyết định phê duyệt Thiết kế & Dự toán', isMandatory: true },
      { docTypeId: 'GDA2_DOC_QD_PHE_DUYET_DA', docTypeName: 'Quyết định phê duyệt Dự án đầu tư', isMandatory: true }
    ]
  }
] as const;

// DANH MỤC TÀI LIỆU VĂN BẢN BẮT BUỘC THEO TỪNG BƯỚC GIAI ĐOẠN 3
export const STAGE3_DOCUMENT_TYPES = [
  {
    stepId: 1,
    stepName: 'Giải phóng mặt bằng (GPMB & Tái định cư)',
    requiredDocs: [
      { docTypeId: 'GDA3_DOC_QD_THU_HOI_DAT', docTypeName: 'Quyết định thu hồi đất của UBND Cấp Tỉnh/Huyện', isMandatory: true },
      { docTypeId: 'GDA3_DOC_PA_BOI_THUONG', docTypeName: 'Phương án bồi thường, hỗ trợ, tái định cư được duyệt', isMandatory: true },
      { docTypeId: 'GDA3_DOC_BB_BAN_GIAO_MB', docTypeName: 'Biên bản bàn giao mặt bằng sạch cho CĐT', isMandatory: true }
    ]
  },
  {
    stepId: 2,
    stepName: 'Kế hoạch & Tổ chức Lựa chọn nhà thầu (LCNT)',
    requiredDocs: [
      { docTypeId: 'GDA3_DOC_QD_PHE_DUYET_KHLCNT', docTypeName: 'Quyết định phê duyệt Kế hoạch LCNT', isMandatory: true },
      { docTypeId: 'GDA3_DOC_HSMT_HSYC', docTypeName: 'Hồ sơ mời thầu (HSMT) / Hồ sơ yêu cầu (HSYC)', isMandatory: true },
      { docTypeId: 'GDA3_DOC_BC_DANH_GIA_HSDT', docTypeName: 'Báo cáo đánh giá HSDT của Tổ chuyên gia', isMandatory: true },
      { docTypeId: 'GDA3_DOC_QD_KET_QUA_TRUNG_THAU', docTypeName: 'Quyết định phê duyệt Kết quả lựa chọn nhà thầu', isMandatory: true }
    ]
  },
  {
    stepId: 3,
    stepName: 'Quản lý Hợp đồng & Phụ lục Hợp đồng',
    requiredDocs: [
      { docTypeId: 'GDA3_DOC_BB_DAM_PHAN_HD', docTypeName: 'Biên bản đàm phán, thương thảo Hợp đồng', isMandatory: true },
      { docTypeId: 'GDA3_DOC_HOP_DONG_CHINH_THUC', docTypeName: 'Hợp đồng kinh tế chính thức (PDF Scan / Ký số SmartCA)', isMandatory: true },
      { docTypeId: 'GDA3_DOC_BAO_LANH_THUC_HIEN', docTypeName: 'Thư bảo lãnh thực hiện hợp đồng của Ngân hàng', isMandatory: true },
      { docTypeId: 'GDA3_DOC_PHU_LUC_HOP_DONG', docTypeName: 'Phụ lục hợp đồng bổ sung (nếu có)', isMandatory: false }
    ]
  }
] as const;

export enum ClosureStatus {
  IN_HANDOVER = 'IN_HANDOVER',      // Đang nghiệm thu & bàn giao
  SETTLED = 'SETTLED',              // Đã tổng hợp quyết toán vốn NĐ 193/2026
  LIQUIDATED = 'LIQUIDATED',        // Đã thanh lý hợp đồng kinh tế
  ARCHIVED = 'ARCHIVED'             // Đã khóa mã & lưu trữ vĩnh viễn
}

export const EXCEL_HANDOVER_COLUMNS = [
  'MÃ HỒ SƠ',
  'TÊN HỒ SƠ BÀN GIAO / BẢN VẼ',
  'LOẠI HỒ SƠ',
  'ĐƠN VỊ BÀN GIAO',
  'NGÀY BÀN GIAO',
  'TRẠNG THÁI'
];
