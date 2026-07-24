/**
 * T2 - SERVICES LAYER
 * Thao tác CRUD Cơ sở dữ liệu ngầm, xử lý hàm tính toán TMĐT, Dự toán BOQ, GPMB, LCNT, Hợp đồng QĐ 1040, Package Hard Block và Batch Insert.
 */

export * from './UserService';

import { PMS_CONFIG, ProjectGroup, ConstructionGrade, ContractType, DesignType, ApprovalStatus, ProcurementMethod, GpmbStatus, PackageType, SystemSettings, DEFAULT_SYSTEM_SETTINGS, INITIAL_USERS, UserAccount } from '../T0_Config';
import { safeNumber, safeString, checkEstimateExceedsTMDT, calculateBiddingSavings, validatePackageDisbursement } from '../T1_Utils';

// --- DATA SCHEMAS & INTERFACES ---

export interface Stage1DocumentRecord {
  docId: string;
  projectId: string;
  stepId: number;
  docTypeId: string;
  docTypeName: string;
  fileName: string;
  fileSizeMB: number;
  fileUrl: string;
  uploadedBy: string;
  uploadTimestamp: string;
  smartCaSigned: boolean;
  smartCaSigner?: string;
  storagePath: string;
}

export interface Stage2DocumentRecord {
  docId: string;
  projectId: string;
  stepId: number;
  docTypeId: string;
  docTypeName: string;
  fileName: string;
  fileSizeMB: number;
  fileUrl: string;
  uploadedBy: string;
  uploadTimestamp: string;
  smartCaSigned: boolean;
  smartCaSigner?: string;
  storagePath: string;
}

export interface Stage3DocumentRecord {
  docId: string;
  projectId: string;
  stepId: number;
  docTypeId: string;
  docTypeName: string;
  fileName: string;
  fileSizeMB: number;
  fileUrl: string;
  uploadedBy: string;
  uploadTimestamp: string;
  smartCaSigned: boolean;
  smartCaSigner?: string;
  storagePath: string;
}

export interface BoqItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  category: 'XÂY_LẮP' | 'THIẾT_BỊ' | 'QUẢN_LÝ' | 'TƯ_VẤN' | 'KHIÊN_TỔN_DỰ_PHÒNG';
}

export interface GanttTaskItem {
  taskId: string;
  taskName: string;
  assignedDept: string;
  startDate: string;
  endDate: string;
  progressPct: number;
  budgetAllocated: number;
}

export interface InternalReviewRecord {
  reviewId: string;
  reviewerDept: string;
  reviewerName: string;
  reviewDate: string;
  status: ApprovalStatus;
  comments: string;
}

export interface SiteClearanceRecord {
  householdId: string;
  ownerName: string;
  mapPlotNo: string;
  recoveredArea: number;
  unitPrice: number;
  totalCompensation: number;
  status: GpmbStatus;
}

export interface ProcurementPackageRecord {
  packageId: string;
  packageName: string;
  packagePrice: number;
  fundingSource: string;
  procurementMethod: ProcurementMethod;
  contractType: ContractType;
  executionMonths: number;
  packageType?: PackageType; // CONSULTING | CONSTRUCTION | EQUIPMENT | NON_CONSULTING
  winningContractor?: string;
  winningPrice?: number;
  savingsAmount?: number;
  savingsPct?: number;
  status: 'DỰ_THẢO' | 'ĐANG_MỜI_THẦU' | 'ĐÃ_PHE_DUYET_KQLCNT' | 'ĐÃ_KÝ_HỢP_ĐỒNG';
}

export interface ContractManagementRecord {
  contractId: string;
  packageId: string;
  contractNo: string;
  contractName: string;
  contractorName: string;
  contractType: ContractType;
  contractValue: number;
  advancePct: number;
  retentionPct: number;
  signDate: string;
  startDate: string;
  endDate: string;
  status: 'HỢP_ĐỒNG_MỚI' | 'ĐANG_THỰC_HIỆN' | 'TẤT_TOÁN';
  addendums?: ContractAddendumRecord[];
}

export interface ContractAddendumRecord {
  addendumId: string;
  addendumNo: string;
  signDate: string;
  adjustedValue: number;
  adjustedDurationDays: number;
  reason: string;
}

// STAGE 4 SCHEMAS: PACKAGE MONITORING & DISBURSEMENT
export interface ConsultingProductRecord {
  productId: string;           // MOC-01
  packageId: string;           // GT-TV-01
  productName: string;         // Báo cáo khảo sát hiện trạng địa chất
  deliveryDate: string;        // 2026-03-15
  completionPct: number;       // 100%
  allocatedAmount: number;     // 1,500,000,000 đ
  acceptanceReportNo: string;  // BB-NT-01/KSS
  status: 'CHỜ_NGHIỆM_THU' | 'ĐÃ_NGHIỆM_THU' | 'ĐÃ_THANH_TOÁN';
}

export interface ConstructionWorkRecord {
  workId: string;              // NT-01
  packageId: string;           // GT-XL-01
  itemCode: string;            // AF.11111
  itemName: string;            // Đào đất hố móng bằng máy đào
  unit: string;                // 100m3
  acceptedQty: number;         // 1500
  unitPrice: number;           // 2,500,000 đ
  totalAcceptedAmount: number; // 3,750,000,000 đ
  logDate: string;             // 2026-05-20
  status: 'ĐÃ_NGHIỆM_THU_HIỆN_TRƯỜNG' | 'ĐÃ_LẬP_BẢNG_XÁC_NHẬN' | 'ĐÃ_GIẢI_NGÂN';
}

export interface PackageDisbursementRecord {
  packageId: string;
  contractValue: number;
  advanceAmount: number;
  cumulativePaid: number;
  remainingLimit: number;
  lastPaymentDate?: string;
  isHardBlocked: boolean;
  blockReason?: string;
}

export interface ProjectData {
  PROJECT_ID: string;
  TEN_DU_AN: string;
  CHỦ_TRƯƠNG_ID: string;
  TUYEN_DUONG_ID?: string;
  MA_BAO_GIA?: string;
  NHOM_DU_AN: ProjectGroup;
  CAP_CONG_TRINH: ConstructionGrade;
  NGUON_VON: string;
  CHU_DAU_TU: string;
  TONG_MUC_DAU_TU: number;
  DU_TOAN_DAU_TU: number;
  TONG_GIA_TRI_HOP_DONG: number;
  LUY_KE_GIAI_NGAN: number;
  TRANG_THAI: 'KHỞI_TẠO' | 'DỰ_TOÁN_ĐÃ_DUYỆT' | 'ĐANG_ĐẤU_THẦU' | 'ĐANG_THI_CÔNG' | 'ĐÃ_BÀN_GIAO' | 'QUYẾT_TOÁN_HOÀN_TẤT';
  GIAI_DOAN_HIEN_TAI: number;
  BUOC_HIEN_TAI_GDA1?: number;
  LUONG_PHAP_LY_GDA1?: string;

  // RBAC & Google Drive Personal Storage Fields
  ownerEmail?: string;
  ownerName?: string;
  assignedEmails?: string[];
  driveFolderId?: string;
  driveWebLink?: string;

  // Giai đoạn 2:
  LOAI_THIET_KE?: DesignType;
  TU_THUC_HIEN_HAY_THUE_TU_VAN?: 'TỰ_THỰC_HIỆN' | 'THUÊ_TƯ_VẤN';
  TEN_DON_VI_TU_VAN?: string;
  TRANG_THAI_THAM_DINH_GDA2?: ApprovalStatus;
  BOQ_ITEMS_GDA2?: BoqItem[];
  GANTT_TASKS_GDA2?: GanttTaskItem[];
  REVIEW_LOGS_GDA2?: InternalReviewRecord[];

  // Giai đoạn 3:
  GPMB_ITEMS_GDA3?: SiteClearanceRecord[];
  KHLCNT_ITEMS_GDA3?: ProcurementPackageRecord[];
  CONTRACT_ITEMS_GDA3?: ContractManagementRecord[];
  DOCUMENT_MATRIX_GDA3?: Stage3DocumentRecord[];

  // Giai đoạn 4 bổ sung:
  CONSULTING_PRODUCTS_GDA4?: ConsultingProductRecord[];
  CONSTRUCTION_WORKS_GDA4?: ConstructionWorkRecord[];
  PACKAGE_DISBURSEMENTS_GDA4?: PackageDisbursementRecord[];

  NGAY_BAT_DAU: string;
  NGAY_HOAN_THANH_DU_KIEN: string;
  KHOI_LUONG_HOAN_THANH_PCT: number;
  CANH_BAO_RED_FLAG: boolean;
  NOI_DUNG_CANH_BAO?: string;
  DANH_SACH_HOP_DONG?: ContractItem[];
  NHAT_KY_THI_CONG?: ELogbookItem[];
  DE_NGHI_THANH_TOAN?: PaymentRequest[];
  LIC_BAO_TRI?: MaintenanceScheduleItem[];
  DOCUMENT_MATRIX_GDA1?: Stage1DocumentRecord[];
  DOCUMENT_MATRIX_GDA2?: Stage2DocumentRecord[];
  HANDOVER_ITEMS_GDA5?: HandoverDossierRecord[];
}

export interface UserProfile {
  email: string;
  name: string;
  role: any;
  avatarUrl: string;
  department: string;
  googleDriveConnected: boolean;
}

export const AVAILABLE_TEST_USERS: UserProfile[] = [
  {
    email: 'hieuvv@company.com',
    name: 'Vũ Văn Hiếu',
    role: 'PROJECT_MANAGER',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
    department: 'Ban Giám Đốc / Trưởng Dự Án',
    googleDriveConnected: true
  },
  {
    email: 'admin@pms2026.gov.vn',
    name: 'Quản Trị Viên (System Admin)',
    role: 'ADMIN',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=256',
    department: 'Ban Điều Hành PMS 2026',
    googleDriveConnected: true
  },
  {
    email: 'kethoath@company.com',
    name: 'Phạm Thu Hà',
    role: 'MEMBER',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=256',
    department: 'Phòng Kế Hoạch - Kỹ Thuật',
    googleDriveConnected: true
  },
  {
    email: 'stranger@otherdomain.com',
    name: 'Khách Không Có Quyền (Stranger)',
    role: 'VIEWER',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256',
    department: 'Đơn Vị Khác',
    googleDriveConnected: false
  }
];

export interface ContractItem {
  CONTRACT_ID: string;
  MA_BAO_GIA: string;
  TEN_GOI_THAU: string;
  NHA_THAU_TRUNG_THAU: string;
  LOAI_HOP_DONG: ContractType;
  GIA_TRI_HOP_DONG: number;
  GIA_TRI_PHU_LUC_PHAT_SINH: number;
  TONG_GIA_TRI_SAU_DIEU_CHINH: number;
  DA_THANH_TOAN_LUY_KE: number;
  CO_PHU_LUC_PHAT_SINH: boolean;
  TRANG_THAI: 'HỢP_ĐỒNG_MỚI' | 'ĐANG_THỰC_HIỆN' | 'TẤT_TOÁN';
}

export interface ELogbookItem {
  LOG_ID: string;
  PROJECT_ID: string;
  NGAY: string;
  THOI_TIET: string;
  NHAN_CONG_HIEN_TRUONG: number;
  MAY_THI_CONG: string;
  KHOI_LUONG_THUC_HIEN_TRONG_NGAY: string;
  ANH_HIEN_TRUONG_URL: string;
  GPS_VI_TRI: string;
  DA_KY_SO_SMART_CA: boolean;
  NGUOI_KY_SMART_CA?: string;
  NGAY_KY_SO?: string;
}

export interface PaymentRequest {
  PAYMENT_ID: string;
  PROJECT_ID: string;
  CONTRACT_ID: string;
  DOT_THANH_TOAN: number;
  GIA_TRI_DE_NGHI: number;
  KHOI_LUONG_LUY_KE_TRINH: number;
  NGAY_DE_NGHI: string;
  TRANG_THAI: 'CHỜ_DUYỆT' | 'ĐÃ_GIẢI_NGÂN' | 'BỊ_TỪ_CHỐI_HARD_BLOCK';
  LY_DO_TU_CHOI?: string;
  SMART_CA_SIGNATURE?: string;
}

export interface MaintenanceScheduleItem {
  SCHEDULE_ID: string;
  PROJECT_ID: string;
  HANG_MUC_BAO_TRI: string;
  CHU_KY_THANG: number;
  NGAY_BAO_TRI_NEXT: string;
  DON_VI_THUC_HIEN: string;
  TRANG_THAI: 'ĐẾN_HẠN' | 'BÌNH_THƯỜNG' | 'QUÁ_HẠN';
}

// --- INITIAL MOCK STORAGE ---
const MOCK_STORAGE_KEY = 'PMS_2026_PROJECTS_DATABASE_V2';

const DEFAULT_PROJECTS: ProjectData[] = [
  {
    PROJECT_ID: 'DA-2026-001',
    TEN_DU_AN: 'Dự án Cầu Giao Thoa Tuyến Đường 01',
    CHỦ_TRƯƠNG_ID: 'CT-2026-889',
    TUYEN_DUONG_ID: 'TD-01',
    MA_BAO_GIA: 'BG-2026-88',
    NHOM_DU_AN: ProjectGroup.NHOM_A,
    CAP_CONG_TRINH: ConstructionGrade.CAP_I,
    LOAI_THIET_KE: DesignType.THIET_KE_BVTC,
    TU_THUC_HIEN_HAY_THUE_TU_VAN: 'THUÊ_TƯ_VẤN',
    TEN_DON_VI_TU_VAN: 'Tổng Công ty Tư vấn Thiết kế Giao thông Vận tải (TEDI)',
    TRANG_THAI_THAM_DINH_GDA2: ApprovalStatus.APPROVED,
    NGUON_VON: 'Ngân sách Đầu tư công 2026',
    CHU_DAU_TU: 'Ban QLDA Đầu tư Xây dựng Công trình Giao thông',
    TONG_MUC_DAU_TU: 950_000_000_000,
    DU_TOAN_DAU_TU: 910_000_000_000,
    TONG_GIA_TRI_HOP_DONG: 880_000_000_000,
    LUY_KE_GIAI_NGAN: 450_000_000_000,
    TRANG_THAI: 'ĐANG_THI_CÔNG',
    GIAI_DOAN_HIEN_TAI: 4,
    BUOC_HIEN_TAI_GDA1: 5,
    LUONG_PHAP_LY_GDA1: 'Luồng Nhóm A: Lập, thẩm định BCNCTKT + Hội đồng thẩm định nhà nước/Cấp bộ',
    ownerEmail: 'hieuvv@company.com',
    ownerName: 'Vũ Văn Hiếu',
    assignedEmails: ['kethoath@company.com', 'ketoan@company.com', 'banql@company.com'],
    driveFolderId: 'DRIVE_FOLDER_DA_2026_001',
    driveWebLink: 'https://drive.google.com/drive/folders/PMS_DA_2026_001',
    NGAY_BAT_DAU: '2026-01-15',
    NGAY_HOAN_THANH_DU_KIEN: '2027-06-30',
    KHOI_LUONG_HOAN_THANH_PCT: 52,
    CANH_BAO_RED_FLAG: false,
    BOQ_ITEMS_GDA2: [
      { itemId: 'BOQ-01', itemCode: 'AF.11111', itemName: 'Đào đất hố móng bằng máy đào 1.25m3', unit: '100m3', quantity: 1500, unitPrice: 2500000, totalAmount: 3750000000, category: 'XÂY_LẮP' },
      { itemId: 'BOQ-02', itemCode: 'AF.22222', itemName: 'Đổ bê tông dầm cầu mác M400', unit: 'm3', quantity: 4500, unitPrice: 3200000, totalAmount: 14400000000, category: 'XÂY_LẮP' },
      { itemId: 'BOQ-03', itemCode: 'TB.01', itemName: 'Hệ thống thiết bị cẩu dầm dầm định hình', unit: 'Bộ', quantity: 2, unitPrice: 15000000000, totalAmount: 30000000000, category: 'THIẾT_BỊ' }
    ],
    GANTT_TASKS_GDA2: [
      { taskId: 'TSK-01', taskName: '1. Khảo sát địa chất & Thiết kế bản vẽ thi công', assignedDept: 'Phòng Kỹ thuật & TEDI', startDate: '2026-02-01', endDate: '2026-03-15', progressPct: 100, budgetAllocated: 15000000000 },
      { taskId: 'TSK-02', taskName: '2. Đo bóc khối lượng & Lập dự toán BOQ chi tiết', assignedDept: 'Phòng Kế hoạch Tổng hợp', startDate: '2026-03-16', endDate: '2026-04-05', progressPct: 100, budgetAllocated: 5000000000 },
      { taskId: 'TSK-03', taskName: '3. Thẩm định nội bộ & Trình duyệt QĐ Thiết kế', assignedDept: 'Hội đồng Thẩm định Nội bộ', startDate: '2026-04-06', endDate: '2026-04-20', progressPct: 100, budgetAllocated: 2000000000 }
    ],
    GPMB_ITEMS_GDA3: [
      { householdId: 'HO-001', ownerName: 'Nguyễn Văn An', mapPlotNo: 'TĐ-05/ST-12', recoveredArea: 350.5, unitPrice: 12000000, totalCompensation: 4206000000, status: GpmbStatus.DA_BAN_GIAO_MAT_BANG },
      { householdId: 'HO-002', ownerName: 'Trần Thị Bình', mapPlotNo: 'TĐ-05/ST-14', recoveredArea: 520.0, unitPrice: 12000000, totalCompensation: 6240000000, status: GpmbStatus.DA_CHI_TRA },
      { householdId: 'HO-003', ownerName: 'Phạm Quốc Cường', mapPlotNo: 'TĐ-06/ST-01', recoveredArea: 180.2, unitPrice: 15000000, totalCompensation: 2703000000, status: GpmbStatus.DA_PHE_DUYET_PA }
    ],
    KHLCNT_ITEMS_GDA3: [
      { packageId: 'GT-TV-01', packageName: 'Gói thầu TV-01: Tư vấn Khảo sát địa chất & Thiết kế BVTC', packagePrice: 15000000000, fundingSource: 'Ngân sách Đầu tư công', procurementMethod: ProcurementMethod.CHI_DINH_THAU_RUT_GON, contractType: ContractType.TRON_GOI, executionMonths: 3, packageType: PackageType.CONSULTING, winningContractor: 'Tổng Công ty Tư vấn Thiết kế TEDI', winningPrice: 14500000000, savingsAmount: 500000000, savingsPct: 3.33, status: 'ĐÃ_KÝ_HỢP_ĐỒNG' },
      { packageId: 'GT-XL-01', packageName: 'Gói thầu XL-01: Thi công Xây lắp Cầu & Đường dẫn', packagePrice: 880000000000, fundingSource: 'Ngân sách Đầu tư công', procurementMethod: ProcurementMethod.DAU_THAU_RONG_RAI, contractType: ContractType.DON_GIA_DIEU_CHINH, executionMonths: 18, packageType: PackageType.CONSTRUCTION, winningContractor: 'Tập đoàn Xây dựng Đèo Cả - Vinaconex', winningPrice: 850000000000, savingsAmount: 30000000000, savingsPct: 3.41, status: 'ĐÃ_KÝ_HỢP_ĐỒNG' },
      { packageId: 'GT-TB-01', packageName: 'Gói thầu TB-01: Cung cấp & Lắp đặt Thiết bị cẩu dầm', packagePrice: 30000000000, fundingSource: 'Ngân sách Đầu tư công', procurementMethod: ProcurementMethod.CHAO_HANG_CANH_TRANH, contractType: ContractType.TRON_GOI, executionMonths: 6, packageType: PackageType.EQUIPMENT, winningContractor: 'Công ty Cổ phần Thiết bị Xây dựng FECON', winningPrice: 29000000000, savingsAmount: 1000000000, savingsPct: 3.33, status: 'ĐÃ_KÝ_HỢP_ĐỒNG' }
    ],
    CONTRACT_ITEMS_GDA3: [
      { contractId: 'HD-TV-01', packageId: 'GT-TV-01', contractNo: '01/2026/HĐ-TV', contractName: 'Hợp đồng Tư vấn Khảo sát & Thiết kế BVTC', contractorName: 'Tổng Công ty Tư vấn Thiết kế TEDI', contractType: ContractType.TRON_GOI, contractValue: 14500000000, advancePct: 30, retentionPct: 5, signDate: '2026-02-01', startDate: '2026-02-01', endDate: '2026-05-01', status: 'ĐANG_THỰC_HIỆN' },
      { contractId: 'HD-XL-01', packageId: 'GT-XL-01', contractNo: '01/2026/HĐ-XL', contractName: 'Hợp đồng Thi công Xây lắp Cầu & Đường dẫn', contractorName: 'Tập đoàn Xây dựng Đèo Cả - Vinaconex', contractType: ContractType.DON_GIA_DIEU_CHINH, contractValue: 850000000000, advancePct: 20, retentionPct: 5, signDate: '2026-05-10', startDate: '2026-05-15', endDate: '2027-11-15', status: 'ĐANG_THỰC_HIỆN' },
      { contractId: 'HD-TB-01', packageId: 'GT-TB-01', contractNo: '01/2026/HĐ-TB', contractName: 'Hợp đồng Cung cấp & Lắp đặt Thiết bị', contractorName: 'Công ty Cổ phần Thiết bị Xây dựng FECON', contractType: ContractType.TRON_GOI, contractValue: 29000000000, advancePct: 20, retentionPct: 5, signDate: '2026-06-01', startDate: '2026-06-05', endDate: '2026-12-05', status: 'ĐANG_THỰC_HIỆN' }
    ],
    CONSULTING_PRODUCTS_GDA4: [
      { productId: 'MOC-01', packageId: 'GT-TV-01', productName: 'Báo cáo khảo sát địa chất & địa hình hiện trường', deliveryDate: '2026-02-28', completionPct: 100, allocatedAmount: 4350000000, acceptanceReportNo: 'BB-NT-01/KSS', status: 'ĐÃ_THANH_TOÁN' },
      { productId: 'MOC-02', packageId: 'GT-TV-01', productName: 'Hồ sơ bản vẽ Thiết kế bản vẽ thi công & Dự toán BOQ', deliveryDate: '2026-04-15', completionPct: 100, allocatedAmount: 10150000000, acceptanceReportNo: 'BB-NT-02/TK', status: 'ĐÃ_NGHIỆM_THU' }
    ],
    CONSTRUCTION_WORKS_GDA4: [
      { workId: 'NT-01', packageId: 'GT-XL-01', itemCode: 'AF.11111', itemName: 'Đào đất hố móng bằng máy đào 1.25m3', unit: '100m3', acceptedQty: 1500, unitPrice: 2500000, totalAcceptedAmount: 3750000000, logDate: '2026-05-25', status: 'ĐÃ_GIẢI_NGÂN' },
      { workId: 'NT-02', packageId: 'GT-XL-01', itemCode: 'AF.22222', itemName: 'Đổ bê tông dầm cầu mác M400', unit: 'm3', acceptedQty: 4500, unitPrice: 3200000, totalAcceptedAmount: 14400000000, logDate: '2026-06-20', status: 'ĐÃ_LẬP_BẢNG_XÁC_NHẬN' }
    ],
    PACKAGE_DISBURSEMENTS_GDA4: [
      { packageId: 'GT-TV-01', contractValue: 14500000000, advanceAmount: 4350000000, cumulativePaid: 8700000000, remainingLimit: 5800000000, lastPaymentDate: '2026-03-05', isHardBlocked: false },
      { packageId: 'GT-XL-01', contractValue: 850000000000, advanceAmount: 170000000000, cumulativePaid: 441300000000, remainingLimit: 408700000000, lastPaymentDate: '2026-06-01', isHardBlocked: false },
      { packageId: 'GT-TB-01', contractValue: 29000000000, advanceAmount: 5800000000, cumulativePaid: 5800000000, remainingLimit: 23200000000, lastPaymentDate: '2026-06-10', isHardBlocked: false }
    ]
  },
  {
    PROJECT_ID: 'DA-2026-002',
    TEN_DU_AN: 'Dự án Nâng Cấp Tuyến Quốc Lộ 1A - Đoạn 2',
    CHỦ_TRƯƠNG_ID: 'CT-2026-902',
    TUYEN_DUONG_ID: 'TD-02',
    NHOM_DU_AN: ProjectGroup.NHOM_B,
    CAP_CONG_TRINH: ConstructionGrade.CAP_I,
    NGUON_VON: 'Vốn Ngân sách Trung ương',
    CHU_DAU_TU: 'Ban QLDA Đường Hồ Chí Minh',
    TONG_MUC_DAU_TU: 250_000_000_000,
    DU_TOAN_DAU_TU: 240_000_000_000,
    TONG_GIA_TRI_HOP_DONG: 235_000_000_000,
    LUY_KE_GIAI_NGAN: 120_000_000_000,
    TRANG_THAI: 'ĐANG_THI_CÔNG',
    GIAI_DOAN_HIEN_TAI: 4,
    ownerEmail: 'truongduan@company.com',
    ownerName: 'Trần Văn Nam',
    assignedEmails: ['kethoath@company.com', 'designer@company.com'],
    driveFolderId: 'DRIVE_FOLDER_DA_2026_002',
    driveWebLink: 'https://drive.google.com/drive/folders/PMS_DA_2026_002',
    NGAY_BAT_DAU: '2026-02-01',
    NGAY_HOAN_THANH_DU_KIEN: '2027-02-01',
    KHOI_LUONG_HOAN_THANH_PCT: 48,
    CANH_BAO_RED_FLAG: false
  },
  {
    PROJECT_ID: 'DA-2026-003',
    TEN_DU_AN: 'Dự án Xây Dựng Bệnh Viện Đa Khoa Trung Tâm 2026',
    CHỦ_TRƯƠNG_ID: 'CT-2026-915',
    NHOM_DU_AN: ProjectGroup.NHOM_A,
    CAP_CONG_TRINH: ConstructionGrade.CAP_DAC_BIET,
    NGUON_VON: 'Vốn Trái phiếu Chính phủ',
    CHU_DAU_TU: 'Bộ Y Tế / Ban QLDA Chuyên Ngành',
    TONG_MUC_DAU_TU: 1_200_000_000_000,
    DU_TOAN_DAU_TU: 1_150_000_000_000,
    TONG_GIA_TRI_HOP_DONG: 1_100_000_000_000,
    LUY_KE_GIAI_NGAN: 350_000_000_000,
    TRANG_THAI: 'ĐANG_ĐẤU_THẦU',
    GIAI_DOAN_HIEN_TAI: 3,
    ownerEmail: 'admin@pms2026.gov.vn',
    ownerName: 'Quản trị viên Hệ thống',
    assignedEmails: ['hieuvv@company.com'],
    driveFolderId: 'DRIVE_FOLDER_DA_2026_003',
    driveWebLink: 'https://drive.google.com/drive/folders/PMS_DA_2026_003',
    NGAY_BAT_DAU: '2026-03-01',
    NGAY_HOAN_THANH_DU_KIEN: '2028-12-31',
    KHOI_LUONG_HOAN_THANH_PCT: 20,
    CANH_BAO_RED_FLAG: false
  }
];

// --- CORE SERVICES ---

export const PmsService = {
  getProjects(): ProjectData[] {
    if (typeof localStorage === 'undefined') {
      return DEFAULT_PROJECTS;
    }
    const raw = localStorage.getItem(MOCK_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(DEFAULT_PROJECTS));
      return DEFAULT_PROJECTS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_PROJECTS;
    }
  },

  getProjectById(projectId: string): ProjectData | undefined {
    const id = safeString(projectId);
    return this.getProjects().find(p => p.PROJECT_ID === id);
  },

  getSystemSettings(): SystemSettings {
    if (typeof localStorage === 'undefined') {
      return DEFAULT_SYSTEM_SETTINGS;
    }
    const raw = localStorage.getItem('PMS_2026_SYSTEM_SETTINGS_KEY');
    if (!raw) {
      localStorage.setItem('PMS_2026_SYSTEM_SETTINGS_KEY', JSON.stringify(DEFAULT_SYSTEM_SETTINGS));
      return DEFAULT_SYSTEM_SETTINGS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_SYSTEM_SETTINGS;
    }
  },

  saveSystemSettings(settings: SystemSettings): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('PMS_2026_SYSTEM_SETTINGS_KEY', JSON.stringify(settings));
    }
  },

  getUserProfiles(): UserProfile[] {
    if (typeof localStorage === 'undefined') {
      return AVAILABLE_TEST_USERS;
    }
    const raw = localStorage.getItem('PMS_2026_USER_PROFILES_KEY');
    if (!raw) {
      localStorage.setItem('PMS_2026_USER_PROFILES_KEY', JSON.stringify(AVAILABLE_TEST_USERS));
      return AVAILABLE_TEST_USERS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return AVAILABLE_TEST_USERS;
    }
  },

  saveUserProfile(profile: UserProfile): void {
    if (typeof localStorage !== 'undefined') {
      const users = this.getUserProfiles();
      const idx = users.findIndex(u => u.email.toLowerCase() === profile.email.toLowerCase());
      if (idx >= 0) {
        users[idx] = profile;
      } else {
        users.push(profile);
      }
      localStorage.setItem('PMS_2026_USER_PROFILES_KEY', JSON.stringify(users));
    }
  },

  getUserAccounts(): UserAccount[] {
    if (typeof localStorage === 'undefined') {
      return INITIAL_USERS;
    }
    const raw = localStorage.getItem('PMS_2026_USER_ACCOUNTS_KEY');
    if (!raw) {
      localStorage.setItem('PMS_2026_USER_ACCOUNTS_KEY', JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_USERS;
    }
  },

  saveUserAccount(account: UserAccount): void {
    if (typeof localStorage !== 'undefined') {
      const accounts = this.getUserAccounts();
      const idx = accounts.findIndex(a => a.id === account.id || a.email.toLowerCase() === account.email.toLowerCase());
      if (idx >= 0) {
        accounts[idx] = {
          ...accounts[idx],
          ...account,
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
        };
      } else {
        accounts.push({
          ...account,
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
        });
      }
      localStorage.setItem('PMS_2026_USER_ACCOUNTS_KEY', JSON.stringify(accounts));

      // Also sync user profile
      const userProfile: UserProfile = {
        email: account.email,
        name: account.fullName,
        role: account.role,
        avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=256`,
        department: account.role === 'ADMIN' ? 'Trung Tâm Công Nghệ' : 'Ban QLDA',
        googleDriveConnected: true
      };
      this.saveUserProfile(userProfile);
    }
  },

  deleteUserAccount(idOrEmail: string): void {
    if (typeof localStorage !== 'undefined') {
      const target = safeString(idOrEmail).toLowerCase();
      const accounts = this.getUserAccounts().filter(a => a.id !== idOrEmail && a.email.toLowerCase() !== target);
      localStorage.setItem('PMS_2026_USER_ACCOUNTS_KEY', JSON.stringify(accounts));
    }
  },

  resetUserPassword(idOrEmail: string, newPass: string = '123456'): void {
    if (typeof localStorage !== 'undefined') {
      const target = safeString(idOrEmail).toLowerCase();
      const accounts = this.getUserAccounts();
      const user = accounts.find(a => a.id === idOrEmail || a.email.toLowerCase() === target);
      if (user) {
        user.passwordHash = newPass;
        user.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
        localStorage.setItem('PMS_2026_USER_ACCOUNTS_KEY', JSON.stringify(accounts));
      }
    }
  },

  /**
   * AUTHENTICATION SESSION MANAGEMENT (WITH JWT TOKEN EXPIRATION CHECK)
   */
  getStoredAuthUser(): (UserProfile & { exp?: number; idToken?: string }) | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    const raw = localStorage.getItem('PMS_USER_DATABASE_KEY_SESSION') || localStorage.getItem('PMS_2026_AUTH_USER_KEY');
    if (!raw) return null;
    try {
      const user = JSON.parse(raw);
      if (!user || !user.email) return null;
      // TOKEN EXPIRATION CHECK (exp payload in seconds)
      if (user.exp && typeof user.exp === 'number') {
        const expiresAtMs = user.exp * 1000;
        if (Date.now() >= expiresAtMs) {
          console.warn('[AUTH GUARD] Token expired! Clearing session & redirecting to login.');
          this.clearStoredAuthUser();
          return null;
        }
      }
      return user;
    } catch {
      this.clearStoredAuthUser();
      return null;
    }
  },

  setStoredAuthUser(user: UserProfile & { exp?: number; idToken?: string }): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('PMS_USER_DATABASE_KEY_SESSION', JSON.stringify(user));
      localStorage.setItem('PMS_2026_AUTH_USER_KEY', JSON.stringify(user));
    }
  },

  clearStoredAuthUser(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('PMS_USER_DATABASE_KEY_SESSION');
      localStorage.removeItem('PMS_2026_AUTH_USER_KEY');
    }
  },

  /**
   * TỰ ĐỘNG PHÂN NHÁNH QUY TRÌNH DỰ ÁN (AUTO-ROUTING ENGINE 4 BRANCHES)
   */
  autoRouteProjectGroup(
    totalInvestment: number,
    isNationalImportant: boolean = false,
    isRenovationOrRepair: boolean = false
  ): {
    group: ProjectGroup;
    recommendedGrade: ConstructionGrade;
    workflowPath: string;
    isBypassBcnctkt: boolean;
    legalBasis: string;
  } {
    const tmdt = safeNumber(totalInvestment);

    if (isRenovationOrRepair || (tmdt > 0 && tmdt <= PMS_CONFIG.PROJECT_GROUP_THRESHOLDS.BCKTKT_MAX_VND)) {
      return {
        group: ProjectGroup.BCKTKT,
        recommendedGrade: ConstructionGrade.CAP_IV,
        workflowPath: 'Luồng BCKTKT: Thu gọn 1 bước, bỏ qua BCNCTKT/BCNCKT. Trình duyệt trực tiếp Báo cáo Kinh tế - Kỹ thuật.',
        isBypassBcnctkt: true,
        legalBasis: `${PMS_CONFIG.LEGAL_REFERENCES.LUAT_XAY_DUNG} & ${PMS_CONFIG.LEGAL_REFERENCES.NGHI_DINH_217}`
      };
    }

    if (isNationalImportant || tmdt >= PMS_CONFIG.PROJECT_GROUP_THRESHOLDS.GROUP_A_MIN_VND) {
      return {
        group: ProjectGroup.NHOM_A,
        recommendedGrade: ConstructionGrade.CAP_DAC_BIET,
        workflowPath: 'Luồng Nhóm A: Lập, thẩm định BCNCTKT + Hội đồng thẩm định nhà nước/Cấp bộ.',
        isBypassBcnctkt: false,
        legalBasis: `${PMS_CONFIG.LEGAL_REFERENCES.LUAT_XAY_DUNG} & ${PMS_CONFIG.LEGAL_REFERENCES.NGHI_DINH_217}`
      };
    }

    if (tmdt >= PMS_CONFIG.PROJECT_GROUP_THRESHOLDS.GROUP_B_MIN_VND) {
      return {
        group: ProjectGroup.NHOM_B,
        recommendedGrade: ConstructionGrade.CAP_I,
        workflowPath: 'Luồng Nhóm B: Lập Báo cáo đề xuất chủ trương đầu tư + Thẩm định Sở KH&ĐT/Cơ quan chuyên môn.',
        isBypassBcnctkt: false,
        legalBasis: `${PMS_CONFIG.LEGAL_REFERENCES.LUAT_XAY_DUNG} & ${PMS_CONFIG.LEGAL_REFERENCES.NGHI_DINH_217}`
      };
    }

    return {
      group: ProjectGroup.NHOM_C,
      recommendedGrade: ConstructionGrade.CAP_III,
      workflowPath: 'Luồng Nhóm C: Quy trình tiêu chuẩn, lập Báo cáo đề xuất chủ trương đầu tư cấp Tỉnh/Huyện.',
      isBypassBcnctkt: false,
      legalBasis: `${PMS_CONFIG.LEGAL_REFERENCES.LUAT_XAY_DUNG} & ${PMS_CONFIG.LEGAL_REFERENCES.NGHI_DINH_217}`
    };
  },

  saveProject(project: ProjectData): ProjectData {
    const list = this.getProjects();
    const cleanId = safeString(project.PROJECT_ID);

    project.TONG_MUC_DAU_TU = safeNumber(project.TONG_MUC_DAU_TU);
    project.DU_TOAN_DAU_TU = safeNumber(project.DU_TOAN_DAU_TU);
    project.TONG_GIA_TRI_HOP_DONG = safeNumber(project.TONG_GIA_TRI_HOP_DONG);
    project.LUY_KE_GIAI_NGAN = safeNumber(project.LUY_KE_GIAI_NGAN);

    if (project.DU_TOAN_DAU_TU > project.TONG_MUC_DAU_TU && project.TONG_MUC_DAU_TU > 0) {
      project.CANH_BAO_RED_FLAG = true;
      project.NOI_DUNG_CANH_BAO = `CẢNH BÁO ĐỎ: Dự toán (${project.DU_TOAN_DAU_TU.toLocaleString()} đ) vượt Tổng mức đầu tư (${project.TONG_MUC_DAU_TU.toLocaleString()} đ)!`;
    } else {
      project.CANH_BAO_RED_FLAG = false;
      project.NOI_DUNG_CANH_BAO = undefined;
    }

    const index = list.findIndex(p => p.PROJECT_ID === cleanId);
    if (index >= 0) {
      list[index] = project;
    } else {
      list.push(project);
    }
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(list));
    return project;
  },

  /**
   * BATCH INSERT EXCEL DỮ LIỆU CÁC GIAI ĐOẠN
   */
  batchInsertScheduleAndBOQ(
    projectId: string,
    rows: any[],
    type: 'GANTT' | 'BOQ' | 'GPMB' | 'KHLCNT' | 'CONSULTING'
  ): { insertedCount: number; project: ProjectData } {
    const project = this.getProjectById(projectId);
    if (!project) throw new Error(`Không tìm thấy dự án ${projectId}`);

    if (type === 'CONSULTING') {
      project.CONSULTING_PRODUCTS_GDA4 = project.CONSULTING_PRODUCTS_GDA4 || [];
      const newProds: ConsultingProductRecord[] = rows.map((r, idx) => ({
        productId: r.productId || `MOC-${idx + 1}`,
        packageId: 'GT-TV-01',
        productName: r.productName || 'Sản phẩm báo cáo tư vấn',
        deliveryDate: r.deliveryDate || new Date().toISOString().split('T')[0],
        completionPct: safeNumber(r.completionPct) || 100,
        allocatedAmount: safeNumber(r.allocatedAmount) || 1000000000,
        acceptanceReportNo: r.acceptanceReportNo || `BB-NT-${idx + 1}`,
        status: 'ĐÃ_NGHIỆM_THU'
      }));
      project.CONSULTING_PRODUCTS_GDA4 = [...project.CONSULTING_PRODUCTS_GDA4, ...newProds];
      this.saveProject(project);
      return { insertedCount: newProds.length, project };
    }

    if (type === 'GPMB') {
      project.GPMB_ITEMS_GDA3 = project.GPMB_ITEMS_GDA3 || [];
      const newItems: SiteClearanceRecord[] = rows.map((r, idx) => ({
        householdId: r.householdId || `HO-${idx + 1}`,
        ownerName: r.ownerName || 'Hộ dân kiểm đếm',
        mapPlotNo: r.mapPlotNo || 'TĐ-01/ST-01',
        recoveredArea: safeNumber(r.recoveredArea) || 100,
        unitPrice: safeNumber(r.unitPrice) || 10000000,
        totalCompensation: (safeNumber(r.recoveredArea) || 100) * (safeNumber(r.unitPrice) || 10000000),
        status: GpmbStatus.CHO_KIEM_DEM
      }));
      project.GPMB_ITEMS_GDA3 = [...project.GPMB_ITEMS_GDA3, ...newItems];
      this.saveProject(project);
      return { insertedCount: newItems.length, project };
    }

    if (type === 'KHLCNT') {
      project.KHLCNT_ITEMS_GDA3 = project.KHLCNT_ITEMS_GDA3 || [];
      const newItems: ProcurementPackageRecord[] = rows.map((r, idx) => ({
        packageId: r.packageId || `GT-${idx + 1}`,
        packageName: r.packageName || 'Gói thầu thi công mới',
        packagePrice: safeNumber(r.packagePrice) || 50000000000,
        fundingSource: 'Ngân sách Nhà nước',
        procurementMethod: ProcurementMethod.DAU_THAU_RONG_RAI,
        contractType: ContractType.DON_GIA_DIEU_CHINH,
        executionMonths: safeNumber(r.executionMonths) || 12,
        status: 'DỰ_THẢO'
      }));
      project.KHLCNT_ITEMS_GDA3 = [...project.KHLCNT_ITEMS_GDA3, ...newItems];
      this.saveProject(project);
      return { insertedCount: newItems.length, project };
    }

    if (type === 'GANTT') {
      project.GANTT_TASKS_GDA2 = project.GANTT_TASKS_GDA2 || [];
      const newTasks: GanttTaskItem[] = rows.map((r, idx) => ({
        taskId: r.taskId || `CV0${idx + 1}`,
        taskName: r.taskName || 'Công việc mới',
        assignedDept: r.assignedDept || 'Phòng Kỹ thuật',
        startDate: r.startDate || new Date().toISOString().split('T')[0],
        endDate: r.endDate || '2026-12-31',
        progressPct: safeNumber(r.progressPct) || 100,
        budgetAllocated: safeNumber(r.budgetAllocated) || 1000000000
      }));
      project.GANTT_TASKS_GDA2 = [...project.GANTT_TASKS_GDA2, ...newTasks];
      this.saveProject(project);
      return { insertedCount: newTasks.length, project };
    } else {
      project.BOQ_ITEMS_GDA2 = project.BOQ_ITEMS_GDA2 || [];
      const newBoq: BoqItem[] = rows.map((r, idx) => {
        const qty = safeNumber(r.quantity) || 1;
        const uPrice = safeNumber(r.unitPrice) || 2500000;
        return {
          itemId: r.itemId || `BOQ-IMP-${idx + 1}`,
          itemCode: r.itemCode || `AF.${idx + 10000}`,
          itemName: r.itemName || 'Công tác thi công bóc tách',
          unit: r.unit || 'm3',
          quantity: qty,
          unitPrice: uPrice,
          totalAmount: qty * uPrice,
          category: r.category === 'THIẾT_BỊ' ? 'THIẾT_BỊ' : 'XÂY_LẮP'
        };
      });
      project.BOQ_ITEMS_GDA2 = [...project.BOQ_ITEMS_GDA2, ...newBoq];
      const summary = this.calculateBoqSummary(project.BOQ_ITEMS_GDA2);
      project.DU_TOAN_DAU_TU = summary.tongDuToanBoq;
      this.saveProject(project);
      return { insertedCount: newBoq.length, project };
    }
  },

  /**
   * CẬP NHẬT SẢN PHẨM TƯ VẤN (Giai đoạn 4)
   */
  saveConsultingProducts(projectId: string, packageId: string, products: ConsultingProductRecord[]): ProjectData {
    const project = this.getProjectById(projectId);
    if (!project) throw new Error(`Không tìm thấy dự án ${projectId}`);
    
    project.CONSULTING_PRODUCTS_GDA4 = project.CONSULTING_PRODUCTS_GDA4 || [];
    const otherPkgProducts = project.CONSULTING_PRODUCTS_GDA4.filter(p => p.packageId !== packageId);
    project.CONSULTING_PRODUCTS_GDA4 = [...otherPkgProducts, ...products];

    return this.saveProject(project);
  },

  /**
   * CẬP NHẬT KHỐI LƯỢNG THI CÔNG / NHẬT KÝ (Giai đoạn 4)
   */
  saveConstructionWorks(projectId: string, packageId: string, works: ConstructionWorkRecord[]): ProjectData {
    const project = this.getProjectById(projectId);
    if (!project) throw new Error(`Không tìm thấy dự án ${projectId}`);

    project.CONSTRUCTION_WORKS_GDA4 = project.CONSTRUCTION_WORKS_GDA4 || [];
    const otherPkgWorks = project.CONSTRUCTION_WORKS_GDA4.filter(w => w.packageId !== packageId);
    project.CONSTRUCTION_WORKS_GDA4 = [...otherPkgWorks, ...works];

    return this.saveProject(project);
  },

  /**
   * YÊU CẦU GIẢI NGÂN THEO GÓI THẦU (VỚI PACKAGE HARD-BLOCK GUARDRAIL)
   */
  requestPackageDisbursement(
    projectId: string,
    packageId: string,
    reqAmount: number
  ): { success: boolean; message: string; updatedDisbursement?: PackageDisbursementRecord } {
    const project = this.getProjectById(projectId);
    if (!project) throw new Error(`Không tìm thấy dự án ${projectId}`);

    const contract = project.CONTRACT_ITEMS_GDA3?.find(c => c.packageId === packageId);
    const contractValue = contract ? contract.contractValue : 50000000000;

    project.PACKAGE_DISBURSEMENTS_GDA4 = project.PACKAGE_DISBURSEMENTS_GDA4 || [];
    let pkgDisbursement = project.PACKAGE_DISBURSEMENTS_GDA4.find(d => d.packageId === packageId);

    if (!pkgDisbursement) {
      pkgDisbursement = {
        packageId,
        contractValue,
        advanceAmount: contractValue * 0.2,
        cumulativePaid: contractValue * 0.2,
        remainingLimit: contractValue * 0.8,
        isHardBlocked: false
      };
    }

    const check = validatePackageDisbursement(
      packageId,
      pkgDisbursement.contractValue,
      pkgDisbursement.cumulativePaid,
      reqAmount
    );

    if (!check.allowed) {
      pkgDisbursement.isHardBlocked = true;
      pkgDisbursement.blockReason = check.message;
      this.saveProject(project);
      return { success: false, message: check.message, updatedDisbursement: pkgDisbursement };
    }

    pkgDisbursement.isHardBlocked = false;
    pkgDisbursement.blockReason = undefined;
    pkgDisbursement.cumulativePaid += reqAmount;
    pkgDisbursement.remainingLimit = Math.max(0, pkgDisbursement.contractValue - pkgDisbursement.cumulativePaid);
    pkgDisbursement.lastPaymentDate = new Date().toISOString().split('T')[0];

    // Recalculate total project cumulative disbursement
    project.LUY_KE_GIAI_NGAN = project.PACKAGE_DISBURSEMENTS_GDA4.reduce((acc, d) => acc + d.cumulativePaid, 0);

    const filtered = project.PACKAGE_DISBURSEMENTS_GDA4.filter(d => d.packageId !== packageId);
    project.PACKAGE_DISBURSEMENTS_GDA4 = [...filtered, pkgDisbursement];

    this.saveProject(project);
    return {
      success: true,
      message: `Đã giải ngân thành công ${reqAmount.toLocaleString()} VNĐ cho Gói thầu [${packageId}]!`,
      updatedDisbursement: pkgDisbursement
    };
  },

  uploadStage1Document(
    projectId: string,
    stepId: number,
    docTypeId: string,
    docTypeName: string,
    fileName: string,
    fileSizeMB: number,
    uploaderName: string,
    smartCaSigned: boolean = true
  ): Stage1DocumentRecord {
    const cleanProjId = safeString(projectId);
    const cleanFileName = safeString(fileName);
    const stepFolderName = `Buoc_${stepId}_Document_Storage`;
    const storagePath = `/PMS_Storage/${cleanProjId}/Giai_Doan_1/${stepFolderName}/`;

    const newDoc: Stage1DocumentRecord = {
      docId: `DOC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      projectId: cleanProjId,
      stepId,
      docTypeId: safeString(docTypeId),
      docTypeName: safeString(docTypeName),
      fileName: cleanFileName,
      fileSizeMB: safeNumber(fileSizeMB) || 2.5,
      fileUrl: '#',
      uploadedBy: safeString(uploaderName) || 'Cán bộ Ban QLDA',
      uploadTimestamp: new Date().toISOString(),
      smartCaSigned: Boolean(smartCaSigned),
      smartCaSigner: smartCaSigned ? 'Chủ tài khoản SmartCA Ban QLDA' : undefined,
      storagePath
    };

    const project = this.getProjectById(cleanProjId);
    if (project) {
      project.DOCUMENT_MATRIX_GDA1 = project.DOCUMENT_MATRIX_GDA1 || [];
      const filtered = project.DOCUMENT_MATRIX_GDA1.filter(d => !(d.stepId === stepId && d.docTypeId === docTypeId));
      filtered.push(newDoc);
      project.DOCUMENT_MATRIX_GDA1 = filtered;
      this.saveProject(project);
    }

    return newDoc;
  },

  uploadStage2Document(
    projectId: string,
    stepId: number,
    docTypeId: string,
    docTypeName: string,
    fileName: string,
    fileSizeMB: number,
    uploaderName: string,
    smartCaSigned: boolean = true
  ): Stage2DocumentRecord {
    const cleanProjId = safeString(projectId);
    const cleanFileName = safeString(fileName);
    const stepFolderName = `Buoc_${stepId}_Design_Cost_Storage`;
    const storagePath = `/PMS_Storage/${cleanProjId}/Giai_Doan_2/${stepFolderName}/`;

    const newDoc: Stage2DocumentRecord = {
      docId: `GDA2-DOC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      projectId: cleanProjId,
      stepId,
      docTypeId: safeString(docTypeId),
      docTypeName: safeString(docTypeName),
      fileName: cleanFileName,
      fileSizeMB: safeNumber(fileSizeMB) || 5.0,
      fileUrl: '#',
      uploadedBy: safeString(uploaderName) || 'Cán bộ Phòng Kỹ thuật / Kế hoạch',
      uploadTimestamp: new Date().toISOString(),
      smartCaSigned: Boolean(smartCaSigned),
      smartCaSigner: smartCaSigned ? 'Hội đồng Thẩm định SmartCA' : undefined,
      storagePath
    };

    const project = this.getProjectById(cleanProjId);
    if (project) {
      project.DOCUMENT_MATRIX_GDA2 = project.DOCUMENT_MATRIX_GDA2 || [];
      const filtered = project.DOCUMENT_MATRIX_GDA2.filter(d => !(d.stepId === stepId && d.docTypeId === docTypeId));
      filtered.push(newDoc);
      project.DOCUMENT_MATRIX_GDA2 = filtered;
      this.saveProject(project);
    }

    return newDoc;
  },

  uploadStage3Document(
    projectId: string,
    stepId: number,
    docTypeId: string,
    docTypeName: string,
    fileName: string,
    fileSizeMB: number,
    uploaderName: string,
    smartCaSigned: boolean = true
  ): Stage3DocumentRecord {
    const cleanProjId = safeString(projectId);
    const cleanFileName = safeString(fileName);
    const stepFolderName = stepId === 1 ? 'Muc_GPMB_Storage' : stepId === 2 ? 'Muc_DauThau_Storage' : 'Muc_HopDong_Storage';
    const storagePath = `/PMS_Storage/${cleanProjId}/Giai_Doan_3/${stepFolderName}/`;

    const newDoc: Stage3DocumentRecord = {
      docId: `GDA3-DOC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      projectId: cleanProjId,
      stepId,
      docTypeId: safeString(docTypeId),
      docTypeName: safeString(docTypeName),
      fileName: cleanFileName,
      fileSizeMB: safeNumber(fileSizeMB) || 5.0,
      fileUrl: '#',
      uploadedBy: safeString(uploaderName) || 'Cán bộ Ban QLDA / Đấu thầu',
      uploadTimestamp: new Date().toISOString(),
      smartCaSigned: Boolean(smartCaSigned),
      smartCaSigner: smartCaSigned ? 'Ban QLDA SmartCA' : undefined,
      storagePath
    };

    const project = this.getProjectById(cleanProjId);
    if (project) {
      project.DOCUMENT_MATRIX_GDA3 = project.DOCUMENT_MATRIX_GDA3 || [];
      const filtered = project.DOCUMENT_MATRIX_GDA3.filter(d => !(d.stepId === stepId && d.docTypeId === docTypeId));
      filtered.push(newDoc);
      project.DOCUMENT_MATRIX_GDA3 = filtered;
      this.saveProject(project);
    }

    return newDoc;
  },

  saveGpmbItems(projectId: string, gpmbItems: SiteClearanceRecord[]): ProjectData {
    const project = this.getProjectById(projectId);
    if (!project) throw new Error(`Không tìm thấy dự án ${projectId}`);
    project.GPMB_ITEMS_GDA3 = gpmbItems;
    return this.saveProject(project);
  },

  saveKhlcntItems(projectId: string, khlcntItems: ProcurementPackageRecord[]): ProjectData {
    const project = this.getProjectById(projectId);
    if (!project) throw new Error(`Không tìm thấy dự án ${projectId}`);

    const updatedItems = khlcntItems.map(pkg => {
      if (pkg.winningPrice && pkg.winningPrice > 0) {
        const savings = calculateBiddingSavings(pkg.packagePrice, pkg.winningPrice);
        return {
          ...pkg,
          savingsAmount: savings.savingsAmount,
          savingsPct: savings.savingsPct,
          status: 'ĐÃ_PHE_DUYET_KQLCNT' as const
        };
      }
      return pkg;
    });

    project.KHLCNT_ITEMS_GDA3 = updatedItems;
    return this.saveProject(project);
  },

  saveContractItems(projectId: string, contractItems: ContractManagementRecord[]): ProjectData {
    const project = this.getProjectById(projectId);
    if (!project) throw new Error(`Không tìm thấy dự án ${projectId}`);
    project.CONTRACT_ITEMS_GDA3 = contractItems;
    project.TONG_GIA_TRI_HOP_DONG = contractItems.reduce((acc, c) => acc + safeNumber(c.contractValue), 0);
    return this.saveProject(project);
  },

  calculateBoqSummary(boqItems: BoqItem[]): {
    chiPhiXayLap: number;
    chiPhiThietBi: number;
    chiPhiQuanLyDuAn: number;
    chiPhiTuVan: number;
    chiPhiKhac: number;
    chiPhiDuPhong: number;
    tongDuToanBoq: number;
  } {
    const safeItems = boqItems || [];
    const chiPhiXayLap = safeItems
      .filter(item => item.category === 'XÂY_LẮP')
      .reduce((acc, item) => acc + (safeNumber(item.quantity) * safeNumber(item.unitPrice)), 0);

    const chiPhiThietBi = safeItems
      .filter(item => item.category === 'THIẾT_BỊ')
      .reduce((acc, item) => acc + (safeNumber(item.quantity) * safeNumber(item.unitPrice)), 0);

    const baseDirectCost = chiPhiXayLap + chiPhiThietBi;

    const chiPhiQuanLyDuAn = Math.round(baseDirectCost * PMS_CONFIG.NORM_RATES.MANAGEMENT_FEE_PCT);
    const chiPhiTuVan = Math.round(baseDirectCost * PMS_CONFIG.NORM_RATES.CONSULTING_FEE_PCT);
    const chiPhiKhac = Math.round(baseDirectCost * PMS_CONFIG.NORM_RATES.OTHER_EXPENSES_PCT);
    const subTotal = baseDirectCost + chiPhiQuanLyDuAn + chiPhiTuVan + chiPhiKhac;
    const chiPhiDuPhong = Math.round(subTotal * PMS_CONFIG.NORM_RATES.CONTINGENCY_FEE_PCT);

    const tongDuToanBoq = subTotal + chiPhiDuPhong;

    return {
      chiPhiXayLap,
      chiPhiThietBi,
      chiPhiQuanLyDuAn,
      chiPhiTuVan,
      chiPhiKhac,
      chiPhiDuPhong,
      tongDuToanBoq
    };
  },

  validatePaymentHardBlock(
    contractValue: number,
    currentCumulativePaid: number,
    newPaymentAmount: number,
    hasAddendum: boolean = false,
    addendumValue: number = 0
  ): { allowed: boolean; message: string; totalLimit: number; proposedCumulative: number } {
    const cValue = safeNumber(contractValue);
    const currPaid = safeNumber(currentCumulativePaid);
    const reqAmount = safeNumber(newPaymentAmount);
    const addVal = safeNumber(addendumValue);

    const totalLimit = hasAddendum ? (cValue + addVal) : cValue;
    const proposedCumulative = currPaid + reqAmount;

    if (proposedCumulative > totalLimit) {
      return {
        allowed: false,
        message: `HARD BLOCK VIOLATION: Tổng lũy kế thanh toán đề xuất (${proposedCumulative.toLocaleString()} đ) VƯỢT QUÁ giá trị hợp đồng được duyệt (${totalLimit.toLocaleString()} đ)! Cần ký bổ sung Phụ lục hợp đồng trước khi giải ngân.`,
        totalLimit,
        proposedCumulative
      };
    }

    return {
      allowed: true,
      message: `Hồ sơ thanh toán hợp lệ. Lũy kế mới (${proposedCumulative.toLocaleString()} đ) nằm trong hạn mức (${totalLimit.toLocaleString()} đ).`,
      totalLimit,
      proposedCumulative
    };
  },

  evaluateContractorCapability(capabilityClass: string, requiredGrade: ConstructionGrade): {
    qualified: boolean;
    score: number;
    reason: string;
  } {
    const capClass = safeString(capabilityClass).toUpperCase();
    if (capClass.includes('HẠNG 1') || capClass.includes('HẠNG I')) {
      return { qualified: true, score: 95, reason: 'Nhà thầu đạt Chứng chỉ Năng lực Hạng I - Đáp ứng mọi cấp công trình' };
    }
    if (capClass.includes('HẠNG 2') || capClass.includes('HẠNG II')) {
      const isOk = requiredGrade !== ConstructionGrade.CAP_DAC_BIET && requiredGrade !== ConstructionGrade.CAP_I;
      return {
        qualified: isOk,
        score: isOk ? 85 : 55,
        reason: isOk ? 'Đạt năng lực thi công công trình Cấp II trở xuống' : 'KHÔNG ĐẠT: Yêu cầu tối thiểu Hạng I cho Công trình Cấp I / Đặc biệt'
      };
    }
    return { qualified: true, score: 75, reason: 'Đạt năng lực tiêu chuẩn cho dự án vừa và nhỏ' };
  }
};
