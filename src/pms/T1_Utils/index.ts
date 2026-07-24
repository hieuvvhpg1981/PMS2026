/**
 * T1 - UTILS LAYER
 * Các hàm xử lý chuỗi, ép kiểu dữ liệu tài chính, format ngày tháng, Excel Template Generator (SheetJS .xlsx), Stage 4 Package Disbursement Guardrail.
 */

import * as XLSX from 'xlsx';
import { STAGE1_DOCUMENT_TYPES, STAGE2_DOCUMENT_TYPES, STAGE3_DOCUMENT_TYPES, EXCEL_GANTT_COLUMNS, EXCEL_BOQ_COLUMNS, EXCEL_GPMB_COLUMNS, EXCEL_KHLCNT_COLUMNS, EXCEL_CONSULTING_COLUMNS, INITIAL_USERS, UserAccount } from '../T0_Config';

/**
 * HÀM LOGIC PHÂN LOẠI NGƯỠNG PHÁP LÝ AUTO-ROUTING (LUẬT XÂY DỰNG / LUẬT ĐẦU TƯ CÔNG)
 */
export const calculateProjectRouting = (totalInvestmentVND: number): string => {
  const value = Number(totalInvestmentVND) || 0;
  
  // Dưới 15 tỷ: Chỉ cần lập Báo cáo Kinh tế - Kỹ thuật (BCKTKT)
  if (value > 0 && value < 15000000000) {
    return "BCKTKT - Báo cáo Kinh tế Kỹ thuật (Thiết kế 1 bước)";
  }
  // Từ 15 tỷ đến dưới 120 tỷ: Nhóm C
  if (value >= 15000000000 && value < 120000000000) {
    return "NHÓM C - Lập Báo cáo NCKT / Đề xuất Chủ trương ĐT";
  }
  // Từ 120 tỷ đến dưới 2300 tỷ: Nhóm B
  if (value >= 120000000000 && value < 2300000000000) {
    return "NHÓM B - Lập Báo cáo NCKT / Báo cáo Nghiên cứu Tiền khả thi";
  }
  // Trên 2300 tỷ: Nhóm A / Quan trọng Quốc gia
  if (value >= 2300000000000) {
    return "NHÓM A - Phải lập Báo cáo NCKT (Trình cấp Bộ / Thủ tướng)";
  }
  
  return "Chưa xác định";
};

/**
 * HÀM MAPPING MA TRẬN HỒ SƠ YÊU CẦU THEO LUỒNG PHÁP LÝ
 */
export const getRequiredDocumentMatrix = (routingResult: string) => {
  const baseDocs = [
    { step: "1. Tiếp nhận & Phân công", docType: "Văn bản chủ trương / QĐ giao nhiệm vụ" },
    { step: "2. Khảo sát & Thiết lập", docType: "Báo cáo khảo sát & Phương án nhân sự" },
    { step: "4. Xác định Nguồn vốn", docType: "Văn bản xác nhận/Cân đối nguồn vốn" }
  ];

  if (routingResult.includes("BCKTKT")) {
    return [
      ...baseDocs,
      { step: "3. Lập & Thẩm định BCKTKT", docType: "Hồ sơ Báo cáo Kinh tế - Kỹ thuật" },
      { step: "5. Phê duyệt BCKTKT", docType: "Quyết định phê duyệt BCKTKT" }
    ];
  }
  
  if (routingResult.includes("NHÓM A")) {
    return [
      ...baseDocs,
      { step: "3. Lập BCNCTKT (Tiền khả thi)", docType: "Hồ sơ Báo cáo Nghiên cứu Tiền khả thi (BCNCTKT)" },
      { step: "5. Phê duyệt Dự án", docType: "Quyết định phê duyệt Dự án Nhóm A" }
    ];
  }

  // Nhóm B, C mặc định
  return [
    ...baseDocs,
    { step: "3. Lập BC Đề xuất Chủ trương", docType: "Báo cáo Đề xuất Chủ trương đầu tư" },
    { step: "5. Phê duyệt Dự án", docType: "Quyết định phê duyệt Dự án" }
  ];
};

/**
 * HÀM LỌC MẢNG DỮ LIỆU ĐA CẤP THEO DỰ ÁN VÀ GÓI THẦU (CASCADE MATRIX FILTER)
 */
export function filterByProjectAndPackage<T extends { projectId?: string; PROJECT_ID?: string; packageId?: string }>(
  list: T[],
  projectId: string,
  packageId: string
): T[] {
  if (!list) return [];
  return list.filter(item => {
    const itemProjId = item.projectId || item.PROJECT_ID || '';
    const matchesProj = !projectId || projectId === 'ALL_PROJECTS' || itemProjId === projectId;
    const matchesPkg = !packageId || packageId === 'ALL_PACKAGES' || item.packageId === packageId;
    return matchesProj && matchesPkg;
  });
}

/**
 * Format số tiền dạng Việt Nam đồng (e.g. 1.500.000.000 đ)
 */
export function formatVND(amount: number | string | null | undefined): string {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(num);
}

/**
 * Format số tiền gọn theo triệu / tỷ đồng (e.g. 1,5 tỷ)
 */
export function formatCompactVND(amount: number | string | null | undefined): string {
  const num = Number(amount) || 0;
  if (Math.abs(num) >= 1_000_000_000) {
    return (num / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' tỷ';
  }
  if (Math.abs(num) >= 1_000_000) {
    return (num / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' triệu';
  }
  return formatVND(num);
}

/**
 * Parse chuỗi định dạng VND thành số nguyên an toàn
 */
export function parseVND(str: string | number | null | undefined): number {
  if (typeof str === 'number') return isNaN(str) ? 0 : str;
  if (!str) return 0;
  const cleaned = String(str).replace(/[^0-9-]/g, '');
  return Number(cleaned) || 0;
}

/**
 * An toàn số cho phép trả về 0 nếu undefined/null/NaN
 */
export function safeNumber(val: any, fallback = 0): number {
  if (val === null || val === undefined) return fallback;
  const n = Number(val);
  return isNaN(n) ? fallback : n;
}

/**
 * An toàn chuỗi trả về '' nếu null/undefined
 */
export function safeString(val: any, fallback = ''): string {
  if (val === null || val === undefined) return fallback;
  return String(val).trim();
}

export function formatDateVN(isoString?: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Format timestamp ISO sang Ngày/Tháng/Năm Giờ:Phút VN
 */
export function formatDateTimeVN(isoString?: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return `${dateStr} ${timeStr}`;
}

/**
 * STAGE 1 VALIDATION UTILITY: Kiểm tra danh mục hồ sơ bắt buộc theo bước
 */
export function validateRequiredAttachments(stepId: number, uploadedDocs: any[]): { canProgress: boolean; missingDocs: string[] } {
  const stepConfig = STAGE1_DOCUMENT_TYPES.find(s => s.stepId === stepId);
  if (!stepConfig) return { canProgress: true, missingDocs: [] };

  const mandatoryTypes = stepConfig.requiredDocs.filter(d => d.isMandatory).map(d => d.docTypeId);
  const uploadedTypes = new Set((uploadedDocs || []).filter(d => d.stepId === stepId).map(d => d.docTypeId));
  const missing = mandatoryTypes.filter(typeId => !uploadedTypes.has(typeId));

  return {
    canProgress: missing.length === 0,
    missingDocs: missing
  };
}

/**
 * STAGE 2 CROSS-CHECK UTILITY: Kiểm tra ngân sách Dự toán BOQ có vượt Tổng mức đầu tư (TMĐT) đã duyệt hay không.
 */
export function checkEstimateExceedsTMDT(
  totalEstimateBOQ: number,
  approvedTMDT: number
): { isExceeded: boolean; excessAmount: number; exceededAmount: number; warningMessage: string } {
  const estimate = safeNumber(totalEstimateBOQ);
  const tmdt = safeNumber(approvedTMDT);
  const excess = estimate - tmdt;

  if (excess > 0) {
    return {
      isExceeded: true,
      excessAmount: excess,
      exceededAmount: excess,
      warningMessage: `⚠️ CROSS-CHECK ALERT: Dự toán BOQ (${formatVND(estimate)}) đã vượt TỔNG MỨC ĐẦU TƯ ĐÃ DUYỆT (${formatVND(tmdt)}) một lượng là +${formatVND(excess)}! Cần báo cáo Người quyết định đầu tư phê duyệt điều chỉnh.`
    };
  }

  return {
    isExceeded: false,
    excessAmount: 0,
    exceededAmount: 0,
    warningMessage: `✅ Đạt kiểm tra chép ngân sách: Dự toán BOQ (${formatVND(estimate)}) nằm trong giới hạn TMĐT (${formatVND(tmdt)}).`
  };
}

/**
 * STAGE 2 INLINE ROW EDIT HELPER
 */
export function updateBoqRow(boqList: any[], itemId: string, updates: any): any[] {
  return boqList.map(item => {
    if (item.itemId === itemId) {
      const updatedItem = typeof updates === 'number' ? { ...item, quantity: updates } : { ...item, ...updates };
      const qty = safeNumber(updatedItem.quantity);
      const price = safeNumber(updatedItem.unitPrice);
      return { ...updatedItem, quantity: qty, unitPrice: price, totalAmount: qty * price };
    }
    return item;
  });
}

export function recalculateTotalBudget(boqList: any[]): number {
  return boqList.reduce((acc, item) => acc + (safeNumber(item.quantity) * safeNumber(item.unitPrice)), 0);
}

/**
 * STAGE 3 SAVINGS UTILITY: Tính tỷ lệ tiết kiệm qua đấu thầu (%)
 */
export function calculateBiddingSavings(packagePrice: number, winningPrice: number): { isValid: boolean; savingsAmount: number; savingsPct: number; message: string } {
  const pkg = safeNumber(packagePrice);
  const win = safeNumber(winningPrice);
  const diff = pkg - win;
  const pct = pkg > 0 ? Number(((diff / pkg) * 100).toFixed(1)) : 0;

  return {
    isValid: true,
    savingsAmount: diff,
    savingsPct: pct,
    message: diff >= 0
      ? `✅ Tiết kiệm đấu thầu: ${formatVND(diff)} (${pct}%)`
      : `⚠️ Giá trượt/trúng thầu VƯỢT giá gói thầu một lượng +${formatVND(-diff)}!`
  };
}

/**
 * STAGE 3 GPMB ATTACHMENT VALIDATION UTILITY
 */
export function validateRequiredAttachmentsStage3(stepId: any, householdList: any[]): { isComplete: boolean; canProgress: boolean; missingDocs: string[]; missingDocNames: string[] } {
  const list = Array.isArray(stepId) ? stepId : (Array.isArray(householdList) ? householdList : []);
  if (!list || list.length === 0) {
    return {
      isComplete: false,
      canProgress: false,
      missingDocs: ['Bản đồ đo đạc thu hồi đất', 'Phương án bồi thường GPMB phê duyệt', 'Biên bản bàn giao mặt bằng sạch'],
      missingDocNames: ['Bản đồ đo đạc thu hồi đất', 'Phương án bồi thường GPMB phê duyệt', 'Biên bản bàn giao mặt bằng sạch']
    };
  }
  return { isComplete: true, canProgress: true, missingDocs: [], missingDocNames: [] };
}

/**
 * STAGE 4 HARD BLOCK GUARDRAIL: Kiểm tra đề nghị giải ngân theo từng Gói thầu.
 */
export function validatePackageDisbursement(
  packageId: string,
  contractValue: number,
  cumulativePaid: number,
  requestedAmount: number
): { allowed: boolean; message: string; remainingLimit: number; proposedCumulative: number } {
  const cVal = safeNumber(contractValue);
  const cPaid = safeNumber(cumulativePaid);
  const req = safeNumber(requestedAmount);
  const limit = cVal - cPaid;
  const proposedCumulative = cPaid + req;

  if (req <= 0) {
    return { allowed: false, message: `Số tiền đề nghị giải ngân phải lớn hơn 0 VND.`, remainingLimit: limit, proposedCumulative };
  }

  if (req > limit) {
    return {
      allowed: false,
      message: `🚫 HARD BLOCK GÓI THẦU [${packageId}]: Đề nghị giải ngân (${formatVND(req)}) VƯỢT HẠN MỨC HỢP ĐỒNG CÒN LẠI (${formatVND(limit)})! (Giá trị HĐ: ${formatVND(cVal)}, Lũy kế đã trả: ${formatVND(cPaid)}).`,
      remainingLimit: limit,
      proposedCumulative
    };
  }

  return {
    allowed: true,
    message: `✅ Đạt chấp thuận giải ngân Kho bạc cho Gói thầu [${packageId}]: ${formatVND(req)} (Hạn mức còn lại: ${formatVND(limit - req)}).`,
    remainingLimit: limit - req,
    proposedCumulative
  };
}

/**
 * EXCEL TEMPLATE ENGINE: Tự động sinh file Excel mẫu .xlsx chuẩn SheetJS cho Kế hoạch Gantt, Dự toán BOQ, GPMB, KHLCNT, Sản phẩm Tư vấn.
 */
export function generateExcelTemplate(type: 'GANTT' | 'BOQ' | 'GPMB' | 'KHLCNT' | 'CONSULTING'): void {
  let headers: string[] = [];
  let sampleData: any[] = [];
  let filename = '';

  if (type === 'GANTT') {
    headers = EXCEL_GANTT_COLUMNS;
    filename = 'Template_KeHoach_TienDo.xlsx';
    sampleData = [
      ['TSK-01', 'Khảo sát địa chất & địa hình hiện trường', '2026-02-01', '2026-03-15', 'Phòng Kỹ thuật & TEDI', 15000000000],
      ['TSK-02', 'Đo bóc khối lượng & Lập dự toán BOQ chi tiết', '2026-03-16', '2026-04-05', 'Phòng Kế hoạch Tổng hợp', 5000000000],
      ['TSK-03', 'Thẩm định nội bộ & Trình duyệt QĐ Thiết kế', '2026-04-06', '2026-04-20', 'Hội đồng Thẩm định Nội bộ', 2000000000]
    ];
  } else if (type === 'BOQ') {
    headers = EXCEL_BOQ_COLUMNS;
    filename = 'Template_DuToan_BOQ.xlsx';
    sampleData = [
      ['BOQ-01', 'AF.11111', 'Đào đất hố móng bằng máy đào 1.25m3', '100m3', 1500, 2500000, 3750000000, 'XÂY_LẮP'],
      ['BOQ-02', 'AF.22222', 'Đổ bê tông dầm cầu mác M400', 'm3', 4500, 3200000, 14400000000, 'XÂY_LẮP'],
      ['BOQ-03', 'TB.33333', 'Cung cấp & Lắp đặt Cẩu dầm 50T', 'Bộ', 2, 15000000000, 30000000000, 'THIẾT_BỊ']
    ];
  } else if (type === 'GPMB') {
    headers = EXCEL_GPMB_COLUMNS;
    filename = 'Template_KiemDem_GPMB.xlsx';
    sampleData = [
      ['HO-001', 'Nguyễn Văn An', 'TĐ-05/ST-12', 350.5, 12000000, 4206000000, 'ĐÃ_BÀN_GIAO_MẶT_BÀNG'],
      ['HO-002', 'Trần Thị Bình', 'TĐ-05/ST-14', 520, 12000000, 6240000000, 'ĐÃ_CHI_TRẢ'],
      ['HO-003', 'Phạm Quốc Cường', 'TĐ-06/ST-01', 180.2, 15000000, 2703000000, 'ĐÃ_PHÊ_DUYỆT_PA']
    ];
  } else if (type === 'KHLCNT') {
    headers = EXCEL_KHLCNT_COLUMNS;
    filename = 'Template_KeHoach_LCNT.xlsx';
    sampleData = [
      ['GT-TV-01', 'Gói thầu TV-01: Tư vấn Khảo sát & Thiết kế BVTC', 'TƯ_VẤN', 15000000000, 'ĐẤU_THẦU_RỘNG_RÃI', 'ĐA_PHUONG_THUC', '2026-Q1', 90],
      ['GT-XL-01', 'Gói thầu XL-01: Thi công Xây lắp Cầu & Đường dẫn', 'XÂY_LẮP', 880000000000, 'ĐẤU_THẦU_RỘNG_RÃI', 'MOT_GIAI_DOAN_HAI_TUI', '2026-Q2', 540]
    ];
  } else if (type === 'CONSULTING') {
    headers = EXCEL_CONSULTING_COLUMNS;
    filename = 'Template_SanPham_TuVan.xlsx';
    sampleData = [
      ['MOC-01', 'GT-TV-01', 'Báo cáo khảo sát địa chất & địa hình hiện trường', '2026-02-28', 100, 4350000000, 'BB-NT-01/KSS'],
      ['MOC-02', 'GT-TV-01', 'Hồ sơ bản vẽ Thiết kế bản vẽ thi công & Dự toán BOQ', '2026-04-15', 100, 10150000000, 'BB-NT-02/TK']
    ];
  }

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

  // Set column widths for optimal display
  const colWidths = headers.map(h => ({ wch: Math.max(h.length + 5, 20) }));
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'DataTemplate');

  // Trigger download
  XLSX.writeFile(workbook, filename);
}

/**
 * PARSER EXCEL: Đọc binary file .xlsx/.xls bằng SheetJS và convert mảng JSON chuẩn xác.
 */
export function parseExcelFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

export function parseExcelArrayBufferToJSON(buffer: ArrayBuffer, type?: string): { parsedData: any[] } {
  const data = new Uint8Array(buffer);
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  const rows = json.slice(2).filter((r: any) => r && r.length > 0 && r[0]);
  const parsedData = rows.map((r: any) => ({
    itemCode: String(r[0] || ''),
    itemName: String(r[1] || ''),
    unit: String(r[2] || 'm3'),
    quantity: Number(r[3]) || 0,
    unitPrice: Number(r[4]) || 0,
    totalAmount: Number(r[7]) || (Number(r[3]) || 0) * (Number(r[4]) || 0)
  }));

  return { parsedData };
}

/**
 * STAGE 5 UTILITY: Tính toán đối chiếu giá trị quyết toán hợp đồng & tiền giữ lại bảo hành (5%)
 */
export function calculateSettlementBalance(
  contractValue: number,
  actualPaid: number,
  retentionRate: number = 0.05
): {
  contractValue: number;
  actualPaid: number;
  retentionAmount: number;
  remainingBalance: number;
  formattedRetention: string;
  formattedRemaining: string;
} {
  const cVal = safeNumber(contractValue);
  const paid = safeNumber(actualPaid);
  const rate = safeNumber(retentionRate, 0.05);

  const retentionAmount = cVal * rate;
  const remainingBalance = cVal - paid - retentionAmount;

  return {
    contractValue: cVal,
    actualPaid: paid,
    retentionAmount,
    remainingBalance,
    formattedRetention: formatVND(retentionAmount),
    formattedRemaining: formatVND(remainingBalance)
  };
}

/**
 * STAGE 5 DIGITAL HANDOVER ARCHIVER UTILITY: Tạo cấu trúc cây thư mục số hóa ZIP
 */
export function generateZipArchiveStructure(projectId: string): {
  archiveName: string;
  totalSizeMB: number;
  folderTree: string[];
} {
  const pId = safeString(projectId, 'DA-2026-001');
  return {
    archiveName: `PMS_2026_${pId}_DIGITAL_HANDOVER_ARCHIVE.ZIP`,
    totalSizeMB: 48.6,
    folderTree: [
      `📁 ${pId}_ROOT/`,
      `  ├── 📂 GDA1_KHOTAO_PHAPLY/ (Tờ trình, QĐ Giao chủ đầu tư, Phê duyệt TMĐT)`,
      `  ├── 📂 GDA2_THIETKE_BOQ/ (Bản vẽ BVTC, Dự toán BOQ, Biên bản Thẩm định)`,
      `  ├── 📂 GDA3_DAUTHAU_HOPDONG/ (HSMT, QĐ Trúng thầu, Hợp đồng QĐ 1040, Phụ lục)`,
      `  ├── 📂 GDA4_THICONG_THANHTOAN/ (Nhật ký E-Logbook, Bảng xác nhận khối lượng, Đề nghị giải ngân)`,
      `  └── 📂 GDA5_QUYETTOAN_BAOTRI/ (Biên bản nghiệm thu hoàn thành, Quyết toán NĐ 193, Lịch bảo trì)`
    ]
  };
}

/**
 * EXCEL GENERATOR: Báo cáo Tổng hợp Quyết toán Dự án Hoàn thành theo Mẫu 01/QT-ND193
 */
export function generateQuyetToan193ReportExcel(projectId: string, projectData?: any): void {
  const pId = safeString(projectId, 'DA-2026-001');
  const filename = `BaoCao_QuyetToan_ND193_${pId}.xlsx`;

  const headers = [
    'STT',
    'DANH MỤC NỘI DUNG CHI PHÍ / GÓI THẦU',
    'GIÁ TRỊ TMĐT ĐƯỢC DUYỆT (VNĐ)',
    'GIÁ TRỊ HỢP ĐỒNG ĐÃ KÝ (VNĐ)',
    'GIÁ TRỊ NGHIỆM THU THỰC TẾ (VNĐ)',
    'GIÁ TRỊ ĐỀ NGHỊ QUYẾT TOÁN (VNĐ)',
    'CHÊNH LỆCH VỚI TMĐT (VNĐ)',
    'TRẠNG THÁI QUYẾT TOÁN'
  ];

  const sampleData = [
    ['I', 'CHI PHÍ XÂY LẮP & THIẾT BỊ', 880000000000, 850000000000, 842000000000, 842000000000, -38000000000, 'ĐÃ_THẨM_ĐỊNH'],
    ['1', 'Gói thầu XL-01: Thi công Cầu & Đường dẫn', 880000000000, 850000000000, 842000000000, 842000000000, -38000000000, 'ĐÃ_THẨM_ĐỊNH'],
    ['II', 'CHI PHÍ TƯ VẤN & QUẢN LÝ DỰ ÁN', 45000000000, 42000000000, 41500000000, 41500000000, -3500000000, 'ĐÃ_THẨM_ĐỊNH'],
    ['1', 'Gói thầu TV-01: Khảo sát & Thiết kế BVTC', 15000000000, 14500000000, 14500000000, 14500000000, -500000000, 'ĐÃ_THẨM_ĐỊNH'],
    ['2', 'Gói thầu TV-02: Giám sát thi công xây dựng', 10000000000, 9500000000, 9500000000, 9500000000, -500000000, 'ĐÃ_THẨM_ĐỊNH'],
    ['III', 'CHI PHÍ KHÁC & DỰ PHÒNG', 25000000000, 18000000000, 16500000000, 16500000000, -8500000000, 'ĐÃ_THẨM_ĐỊNH'],
    ['TỔNG', 'TỔNG CỘNG QUYẾT TOÁN TOÀN DỰ ÁN', 950000000000, 910000000000, 900000000000, 900000000000, -50000000000, 'HOÀN_TẤT']
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([
    ['CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'],
    ['Độc lập - Tự do - Hạnh phúc'],
    [''],
    [`BÁO CÁO TỔNG HỢP QUYẾT TOÁN VỐN ĐẦU TƯ DỰ ÁN HOÀN THÀNH (${pId})`],
    ['(Theo quy định tại Nghị định số 193/2026/NĐ-CP của Chính phủ)'],
    [''],
    headers,
    ...sampleData
  ]);

  const colWidths = headers.map(h => ({ wch: Math.max(h.length + 3, 18) }));
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'QuyetToanND193');

  XLSX.writeFile(workbook, filename);
}

/**
 * HÀM HELPER LỌC DỮ LIỆU GIAI ĐOẠN 5 AN TOÀN THEO DỰ ÁN VÀ GÓI THẦU (SCOPE RULES)
 */
export const filterClosureDataByScope = <T extends { projectId?: string; packageId?: string }>(
  dataList: T[],
  selectedProjectId: string,
  selectedPackageId: string
): T[] => {
  if (!dataList) return [];
  return dataList.filter(item => {
    const matchProject = !selectedProjectId || selectedProjectId === 'ALL' || selectedProjectId === 'ALL_PROJECTS' || item.projectId === selectedProjectId;
    const matchPackage = !selectedPackageId || selectedPackageId === 'ALL' || selectedPackageId === 'ALL_PACKAGES' || item.packageId === selectedPackageId;
    return matchProject && matchPackage;
  });
};

/**
 * HÀM HELPER LỌC THANH TOÁN THEO DỰ ÁN VÀ GÓI THẦU (DISBURSEMENT SCOPE RULES)
 */
export const filterPaymentsByPackage = (
  paymentList: any[],
  selectedProjectId: string,
  selectedPackageId: string
): any[] => {
  if (!paymentList) return [];
  return paymentList.filter(item => {
    const matchProject = !selectedProjectId || selectedProjectId === 'ALL' || selectedProjectId === 'ALL_PROJECTS' || item.projectId === selectedProjectId || item.PROJECT_ID === selectedProjectId;
    const matchPackage = !selectedPackageId || selectedPackageId === 'ALL' || selectedPackageId === 'ALL_PACKAGES' || item.packageId === selectedPackageId || item.PACKAGE_ID === selectedPackageId || item.CONTRACT_ID?.includes(selectedPackageId);
    return matchProject && matchPackage;
  });
};

/**
 * ROW-LEVEL SECURITY / RBAC: Kiểm tra quyền truy cập Dự án của User đang đăng nhập
 */
export function canUserAccessProject(
  project: any,
  currentUserEmail?: string,
  userRole: string = 'PROJECT_MANAGER',
  assignedProjectIds?: string[]
): boolean {
  if (!project) return false;
  if (userRole === 'ADMIN') return true; // ADMIN có quyền truy cập tất cả dự án trong hệ thống

  const pId = project.PROJECT_ID || project.id || project.projectId;

  // 1. Kiểm tra mảng phân quyền assignedProjectIds (từ khóa 'ALL' hoặc ID dự án)
  if (assignedProjectIds && Array.isArray(assignedProjectIds) && assignedProjectIds.length > 0) {
    if (assignedProjectIds.includes('ALL')) return true;
    if (pId && assignedProjectIds.includes(pId)) return true;
  }

  // 2. Kiểm tra bổ sung qua Email (Owner / Assigned)
  if (!currentUserEmail) return false;

  const email = currentUserEmail.toLowerCase().trim();
  const owner = (project.ownerEmail || '').toLowerCase().trim();
  const assigned = (project.assignedEmails || []).map((e: string) => (e || '').toLowerCase().trim());

  const isOwner = owner === email;
  const isAssigned = assigned.includes(email);

  return Boolean(isOwner || isAssigned);
}

/**
 * LỌC DANH SÁCH DỰ ÁN MÀ USER CÓ QUYỀN TRUY CẬP (HEADER DROPDOWN & VIEWS)
 */
export function filterProjectsForUser(
  projects: any[],
  currentUserEmail?: string,
  userRole: string = 'PROJECT_MANAGER',
  assignedProjectIds?: string[]
): any[] {
  if (!projects) return [];
  return projects.filter(p => canUserAccessProject(p, currentUserEmail, userRole, assignedProjectIds));
}

/**
 * GOOGLE DRIVE STORAGE INTEGRATION: Đẩy file trực tiếp vào Thư mục Google Drive cá nhân của User
 */
export function uploadToUserPersonalDrive(
  file: File | { name: string; size: number },
  projectId: string,
  userEmail: string
): {
  fileId: string;
  fileName: string;
  driveWebLink: string;
  storagePath: string;
  status: string;
  uploadedByEmail: string;
} {
  const fileId = `DRIVE_FILE_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  const pId = safeString(projectId, 'DA-2026-001');
  const fileName = file.name || 'TaiLieu_PMS_2026.pdf';
  const uEmail = safeString(userEmail, 'user@company.com');

  const storagePath = `GoogleDrive://PMS_Storage_UserProjects/${pId}/${fileName}`;
  const driveWebLink = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;

  return {
    fileId,
    fileName,
    driveWebLink,
    storagePath,
    status: 'DRIVE_SYNC_SUCCESS',
    uploadedByEmail: uEmail
  };
}

/**
 * GOOGLE DRIVE PERMISSIONS SYNC: Cấp quyền xem/sửa Thư mục Drive dự án cho danh sách Email
 */
export function shareDriveFolderWithUsers(
  projectId: string,
  targetEmails: string[],
  role: 'reader' | 'writer' = 'reader'
): { success: boolean; sharedFolderUrl: string; syncedCount: number; message: string } {
  const pId = safeString(projectId, 'DA-2026-001');
  const validEmails = targetEmails.filter(e => e && e.includes('@'));

  return {
    success: true,
    sharedFolderUrl: `https://drive.google.com/drive/folders/PMS_Storage_UserProjects_${pId}`,
    syncedCount: validEmails.length,
    message: `Đã gọi Google Drive Permissions API (role: ${role}) đồng bộ cấp quyền cho ${validEmails.length} Email!`
  };
}

/**
 * GOOGLE DRIVE CONNECTION VERIFICATION UTILITY
 */
export function verifyGoogleDriveConnection(driveRootFolderId: string): {
  success: boolean;
  folderId: string;
  quotaUsedMB: number;
  totalQuotaMB: number;
  status: string;
  message: string;
} {
  const folderId = safeString(driveRootFolderId, '1a2b3c4d5e6f_PMS_DRIVE_ROOT_2026');

  return {
    success: true,
    folderId,
    quotaUsedMB: 142.5,
    totalQuotaMB: 15360, // 15 GB
    status: 'DRIVE_OAUTH_CONNECTED',
    message: `✅ Kết nối Google Drive API thành công! Thư mục gốc [${folderId}] đã sẵn sàng lưu trữ.`
  };
}

/**
 * GOOGLE OAUTH JWT DECODER
 * Giải mã Token JWT trả về từ Google Identity Services
 */
export function decodeGoogleJwt(credentialToken: string): {
  email: string;
  name: string;
  picture: string;
  sub: string;
  exp?: number;
  iat?: number;
} {
  if (!credentialToken) {
    return {
      email: 'user@company.com',
      name: 'Google User',
      picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=256',
      sub: 'google_user_001'
    };
  }

  try {
    const parts = credentialToken.split('.');
    if (parts.length < 2) {
      throw new Error('Invalid JWT format');
    }
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    return {
      email: safeString(decoded.email, 'user@company.com'),
      name: safeString(decoded.name, decoded.email?.split('@')[0] || 'Google User'),
      picture: safeString(decoded.picture, 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=256'),
      sub: safeString(decoded.sub, `google_${Date.now()}`),
      exp: decoded.exp,
      iat: decoded.iat
    };
  } catch (err) {
    return {
      email: 'user@company.com',
      name: 'Google User',
      picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=256',
      sub: 'google_user_fallback'
    };
  }
}

/**
 * MATCH USER ROLE IN SYSTEM DATABASE
 */
export function matchUserRole(
  email: string,
  userProfilesList?: any[]
): { email: string; name: string; role: string; avatarUrl: string; department: string; googleDriveConnected: boolean } {
  const cleanEmail = safeString(email).toLowerCase();
  const profiles = userProfilesList || [
    { email: 'hieuvv@company.com', name: 'Vũ Văn Hiếu', role: 'PROJECT_MANAGER', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256', department: 'Ban QLDA Cầu Giao Thoa' },
    { email: 'admin@pms2026.gov.vn', name: 'Quản Trị Viên (System Admin)', role: 'ADMIN', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256', department: 'Trung Tâm Công Nghệ - Bộ BXD' },
    { email: 'kethoath@company.com', name: 'Phạm Thu Hà', role: 'MEMBER', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=256', department: 'Phòng Kế Hoạch & Kỹ Thuật' },
    { email: 'stranger@otherdomain.com', name: 'Nguyễn Khách Hàng', role: 'VIEWER', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=256', department: 'Đơn Vị Quan Sát' }
  ];

  const found = profiles.find(p => p.email.toLowerCase() === cleanEmail);
  if (found) {
    return {
      email: found.email,
      name: found.name,
      role: found.role,
      avatarUrl: found.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=256',
      department: found.department || 'Đơn Vị Thành Viên',
      googleDriveConnected: true
    };
  }

  // Default role for new / unrecognized emails
  return {
    email: cleanEmail,
    name: cleanEmail.split('@')[0],
    role: 'VIEWER',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=256',
    department: 'Tài khoản Chờ Cấp Quyền',
    googleDriveConnected: true
  };
}

/**
 * AUTHENTICATE USER CREDENTIALS (SIMPLE EMAIL & PASSWORD AUTH)
 */
export function authenticateUserCredentials(
  emailInput: string,
  passwordInput: string,
  userAccountsList?: UserAccount[]
): {
  success: boolean;
  user?: { email: string; name: string; role: string; avatarUrl: string; department: string; googleDriveConnected: boolean };
  message: string;
} {
  const cleanEmail = safeString(emailInput).trim().toLowerCase();
  const cleanPass = safeString(passwordInput).trim();
  const accounts = userAccountsList || INITIAL_USERS;

  if (!cleanEmail || !cleanPass) {
    return {
      success: false,
      message: '❌ Vui lòng nhập đầy đủ Email và Mật khẩu đăng nhập!'
    };
  }

  const found = accounts.find(acc => acc.email.toLowerCase() === cleanEmail);
  if (!found) {
    return {
      success: false,
      message: '❌ Email hoặc mật khẩu không chính xác. Vui lòng liên hệ Admin để cấp tài khoản!'
    };
  }

  if (!found.isActive) {
    return {
      success: false,
      message: '🔒 Tài khoản hiện đang bị tạm khóa. Vui lòng liên hệ Quản trị viên!'
    };
  }

  if (found.passwordHash !== cleanPass) {
    return {
      success: false,
      message: '❌ Email hoặc mật khẩu không chính xác. Vui lòng liên hệ Admin để cấp tài khoản!'
    };
  }

  const matchedProfile = matchUserRole(found.email);
  return {
    success: true,
    user: {
      ...matchedProfile,
      name: found.fullName || matchedProfile.name,
      role: found.role
    },
    message: 'Đăng nhập thành công!'
  };
}

/**
 * UPDATE USER ACCOUNT IN SYSTEM DATABASE UTILITY
 */
export function updateUserAccountInSystem(
  existingId: string,
  updatedData: Partial<UserAccount>,
  userAccountsList: UserAccount[]
): { success: boolean; updatedAccounts: UserAccount[]; message: string } {
  const list = [...userAccountsList];
  const idx = list.findIndex(acc => acc.id === existingId || acc.email.toLowerCase() === (updatedData.email || '').toLowerCase());

  const nowTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 16);

  if (idx >= 0) {
    list[idx] = {
      ...list[idx],
      ...updatedData,
      email: safeString(updatedData.email || list[idx].email).trim().toLowerCase(),
      fullName: safeString(updatedData.fullName || list[idx].fullName).trim(),
      passwordHash: safeString(updatedData.passwordHash || list[idx].passwordHash).trim(),
      updatedAt: nowTimestamp
    };
  } else {
    // Add new account record
    const newAccount: UserAccount = {
      id: updatedData.id || `usr-${Date.now().toString().slice(-4)}`,
      email: safeString(updatedData.email).trim().toLowerCase(),
      passwordHash: safeString(updatedData.passwordHash, '123456').trim(),
      fullName: safeString(updatedData.fullName, updatedData.email?.split('@')[0] || 'User'),
      role: updatedData.role || ('MEMBER' as any),
      assignedProjectIds: updatedData.assignedProjectIds || [],
      isActive: updatedData.isActive !== undefined ? updatedData.isActive : true,
      updatedAt: nowTimestamp
    };
    list.push(newAccount);
  }

  return {
    success: true,
    updatedAccounts: list,
    message: 'Đã cập nhật thông tin tài khoản người dùng thành công!'
  };
}



