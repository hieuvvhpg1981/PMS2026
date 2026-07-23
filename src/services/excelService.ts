import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const generatePlanTemplate = async (departments: string[]) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Kế hoạch Năm');

  // Define Columns
  sheet.columns = [
    { header: 'STT', key: 'stt', width: 8 },
    { header: 'Mã KH', key: 'planId', width: 20 },
    { header: 'Phụ lục', key: 'appendix', width: 25 },
    { header: 'Khoản mục chi phí', key: 'costItem', width: 20 },
    { header: 'Nội dung chi phí', key: 'description', width: 45 },
    { header: 'Kinh phí được duyệt (VNĐ)', key: 'budget', width: 25 },
    { header: 'Phòng thực hiện', key: 'departmentName', width: 25 },
    { header: 'Theo quyết định', key: 'theoQuyetDinh', width: 30 },
    { header: 'Năm', key: 'namKeHoach', width: 15 },
  ];

  // Add some sample rows to demonstrate the formula
  for (let i = 2; i <= 100; i++) {
    const row = sheet.getRow(i);
    row.getCell(1).value = i - 1; // STT
    row.getCell(9).value = new Date().getFullYear(); // Default Year
    
    // Exact complex formula required by user:
    // =TRIM(LEFT(C2,SEARCH("-",C2&"-")-1))&"."&IF(ISNUMBER(VALUE(SUBSTITUTE(D2,".",""))),IFERROR(LOOKUP(2,1/(NOT(ISNUMBER(VALUE(SUBSTITUTE($D$2:D2,".",""))))),$D$2:D2)&".",""),"")&D2
    // Note: Changed ; to , for standard ExcelJS formula compatibility
    row.getCell(2).value = { 
      formula: `TRIM(LEFT(C${i},SEARCH("-",C${i}&"-")-1))&"."&IF(ISNUMBER(VALUE(SUBSTITUTE(D${i},".",""))),IFERROR(LOOKUP(2,1/(NOT(ISNUMBER(VALUE(SUBSTITUTE($D$2:D${i},".",""))))),$D$2:D${i})&".",""),"")&D${i}`,
      result: undefined 
    };
  }

  // Data Validation for Department (Column G)
  if (departments.length > 0) {
    const deptList = departments.join(',');
    for (let i = 2; i <= 100; i++) {
      sheet.getCell(`G${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${deptList}"`],
        showErrorMessage: true,
        errorTitle: 'Lỗi',
        error: 'Vui lòng chọn phòng ban từ danh sách hoặc nhập mới.'
      };
    }
  }

  // Styling
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E40AF' } // Blue-800
  };
  sheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

  // Format Budget Column
  sheet.getColumn(6).numFmt = '#,##0 "VNĐ"';

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, 'Template_KeHoach_PVOIL_Chuan.xlsx');
};

export const generateContractTemplate = async (procurementMethods: string[]) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Danh sách Hợp đồng');
  const refSheet = workbook.addWorksheet('_DanhMuc');
  refSheet.state = 'veryHidden';

  // Ghi danh mục hình thức thầu vào sheet ẩn
  const methods = procurementMethods.length > 0
    ? procurementMethods
    : ['Chỉ định thầu', 'Chào hàng cạnh tranh', 'Đấu thầu rộng rãi', 'Mua sắm trực tiếp', 'Đấu thầu hạn chế'];
  methods.forEach((m, i) => { refSheet.getCell(`A${i + 1}`).value = m; });

  // Ghi trạng thái thanh toán vào sheet ẩn (cột B)
  ['Chưa chi', 'Đã chi'].forEach((s, i) => { refSheet.getCell(`B${i + 1}`).value = s; });

  // ─── Định nghĩa cột (18 cột) ──────────────────────────────────────
  sheet.columns = [
    { header: 'STT',                         key: 'stt',                width: 6  },
    { header: 'Số Hợp đồng',                 key: 'contractNumber',     width: 22 },
    { header: 'Tên / Nội dung Hợp đồng',     key: 'tenHopDong',         width: 45 },
    { header: 'Ngày ký (YYYY-MM-DD)',        key: 'date',               width: 20 },
    { header: 'Nhà thầu',                    key: 'contractor',         width: 38 },
    { header: 'Thời hạn HĐ (số ngày)',       key: 'thoi_han_hd',        width: 20 },
    { header: 'Ngày kết thúc',               key: 'ngay_ket_thuc',      width: 18 },
    { header: 'Giá trị Hợp đồng (VNĐ)',      key: 'value',              width: 22 },
    { header: 'Hình thức lựa chọn nhà thầu', key: 'procurement_method', width: 32 },
    { header: 'Mã Kế hoạch (planId)',         key: 'planId',             width: 22 },
    { header: 'Ngày hết hạn (YYYY-MM-DD)',   key: 'ngay_het_han',       width: 22 },
    { header: 'Tiền tạm ứng (VNĐ)',          key: 'tien_tam_ung',       width: 22 },
    { header: 'Đợt TT1 - Số tiền',           key: 'tt1_sotien',         width: 18 },
    { header: 'Đợt TT1 - Ngày dự kiến',      key: 'tt1_ngay',           width: 20 },
    { header: 'Đợt TT1 - Trạng thái',        key: 'tt1_trangthai',      width: 16 },
    { header: 'Đợt TT2 - Số tiền',           key: 'tt2_sotien',         width: 18 },
    { header: 'Đợt TT2 - Ngày dự kiến',      key: 'tt2_ngay',           width: 20 },
    { header: 'Đợt TT2 - Trạng thái',        key: 'tt2_trangthai',      width: 16 },
  ];

  // Dữ liệu mẫu dòng 2
  sheet.getRow(2).values = [
    1, 'HĐ-001/2026', 'Hợp đồng mua sắm thiết bị', '2026-01-15',
    'Công ty ABC', 30, '2026-02-14', 500000000, methods[0] || '', 'KHQL.2026.001',
    '2026-12-31', 50000000,
    100000000, '2026-06-30', 'Chưa chi',
    150000000, '2026-12-15', 'Chưa chi',
  ];



  // ─── Data Validation ───────────────────────────────────────────────
  const methodsList = methods.join(',');
  const useFormula = methods.length <= 10;

  for (let i = 2; i <= 200; i++) {
    // Cột G: Hình thức thầu
    sheet.getCell(`G${i}`).dataValidation = {
      type: 'list', allowBlank: true,
      formulae: useFormula ? [`"${methodsList}"`] : [`_DanhMuc!$A$1:$A$${methods.length}`],
      showDropDown: false, showErrorMessage: true, errorStyle: 'warning',
      errorTitle: 'Lưu ý', error: 'Vui lòng chọn hình thức thầu từ danh sách.',
    };
    // Cột M, P: Trạng thái thanh toán Đợt 1 & 2
    for (const col of ['M', 'P']) {
      sheet.getCell(`${col}${i}`).dataValidation = {
        type: 'list', allowBlank: true,
        formulae: [`"Chưa chi,Đã chi"`],
        showDropDown: false, showErrorMessage: true, errorStyle: 'warning',
        errorTitle: 'Trạng thái', error: 'Chọn: Chưa chi hoặc Đã chi',
      };
    }
  }

  // ─── Styling Header ────────────────────────────────────────────────
  const headerRow = sheet.getRow(1);
  headerRow.height = 36;
  headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  // Màu từng nhóm cột
  const colColors: Record<number, string> = {
    1: 'FF334155', 2: 'FF1D4ED8', 3: 'FF1D4ED8', 4: 'FF1D4ED8',
    5: 'FF1D4ED8', 6: 'FF1D4ED8', 7: 'FF5B21B6', 8: 'FF0F766E',
    9: 'FFB91C1C',  // Ngày hết hạn — đỏ
    10: 'FFB45309', // Tiền tạm ứng — vàng
    11: 'FF15803D', 12: 'FF15803D', 13: 'FF15803D', // Đợt TT1 — xanh lá
    14: 'FF0369A1', 15: 'FF0369A1', 16: 'FF0369A1', // Đợt TT2 — xanh dương
  };

  for (let col = 1; col <= 16; col++) {
    const cell = headerRow.getCell(col);
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colColors[col] || 'FF334155' } };
    cell.border = { bottom: { style: 'medium', color: { argb: 'FF1E293B' } } };
  }

  // Format số tiền
  for (const col of [6, 10, 11, 14]) sheet.getColumn(col).numFmt = '#,##0';

  // ─── Ghi chú hướng dẫn ────────────────────────────────────────────
  sheet.getCell('G1').note = '▼ Chọn từ danh sách — Quản lý tại Cài đặt hệ thống';
  sheet.getCell('I1').note = 'Ngày hết hạn hợp đồng. Hệ thống sẽ cảnh báo đỏ khi còn ≤5 ngày.';
  sheet.getCell('J1').note = 'Số tiền đã tạm ứng cho nhà thầu';
  sheet.getCell('K1').note = 'Nhập số tiền đợt thanh toán thứ nhất';
  sheet.getCell('M1').note = 'Chọn: Chưa chi hoặc Đã chi';

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Template_HopDong_PVOIL_v3_${new Date().toISOString().split('T')[0]}.xlsx`);
};





export const parsePlanExcel = async (file: File) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.getWorksheet(1);
  
  const data: any[] = [];
  sheet?.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    
    const planIdCell = row.getCell(2);
    let planId = planIdCell.type === ExcelJS.ValueType.Formula ? (planIdCell.result as string) : planIdCell.value;

    // Validation: Skip if planId is null, undefined, empty, or just a dot "."
    if (!planId || String(planId).trim() === "" || String(planId).trim() === ".") return;

    const planIdStr = String(planId).trim().replace(/\//g, '-');

    // Further validation: Must have length > 1 to be a valid hierarchical ID
    if (planIdStr.length <= 1) return;

    data.push({
      planId: planIdStr,
      appendix: row.getCell(3).value,
      costItem: row.getCell(4).value,
      description: row.getCell(5).value,
      budget: Number(row.getCell(6).value) || 0,
      departmentName: row.getCell(7).value,
      theoQuyetDinh: row.getCell(8).value,
      namKeHoach: Number(row.getCell(9).value) || null,
      additional_info: {}
    });
  });
  
  return data;
};

export const exportReport = async (plans: any[], forecasts: any[], invoices: any[], deptName: string) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Báo cáo Tổng hợp');

  // Header
  sheet.mergeCells('A1:O1');
  sheet.getCell('A1').value = `BÁO CÁO KẾ HOẠCH & THỰC HIỆN GIẢI NGÂN - ${deptName.toUpperCase()}`;
  sheet.getCell('A1').font = { bold: true, size: 14 };
  sheet.getCell('A1').alignment = { horizontal: 'center' };

  // Table Headers
  const headers = ['STT', 'Mã KH', 'Nội dung chi phí', 'Kinh phí duyệt (Năm)', 'Tổng Kế hoạch', 'Lũy kế Thực hiện', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
  sheet.getRow(3).values = headers;
  sheet.getRow(3).font = { bold: true };

  plans.forEach((plan, idx) => {
    const rowIdx = idx + 4;
    const row = sheet.getRow(rowIdx);
    row.getCell(1).value = idx + 1;
    row.getCell(2).value = plan.planId;
    row.getCell(3).value = plan.description;
    row.getCell(4).value = plan.budget;
    row.getCell(4).numFmt = '#,##0.00';
    
    row.getCell(5).value = plan.totalPlanned;
    row.getCell(5).numFmt = '#,##0.00';
    row.getCell(5).font = { color: { argb: 'FF1E40AF' } }; // Blue

    row.getCell(6).value = plan.accumulatedActual;
    row.getCell(6).numFmt = '#,##0.00';
    row.getCell(6).font = { color: { argb: 'FF059669' } }; // Emerald
    
    // Fill months
    for (let m = 1; m <= 12; m++) {
      const forecast = forecasts.find(f => f.planId === plan.planId && f.month === m);
      const actualInvoice = invoices.find(i => i.planId === plan.planId && i.month === m);

      const cell = row.getCell(m + 6); // Offset by 6 columns
      if (actualInvoice && actualInvoice.totalAmount > 0) {
        // Black font for actual (already scaled in ReportView)
        cell.value = actualInvoice.totalAmount;
        cell.font = { color: { argb: 'FF000000' } };
        cell.numFmt = '#,##0.00';
      } else if (forecast && forecast.amount > 0) {
        // Red font for forecast (already in Million VND)
        cell.value = forecast.amount;
        cell.font = { color: { argb: 'FFFF0000' } };
        cell.numFmt = '#,##0.00';
      }
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `BaoCao_${deptName}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// ============================================================
// exportFilteredContracts — Xuất hợp đồng theo bộ lọc hiện tại
// Dùng tại DocumentView khi nhấn "Xuất báo cáo"
// ============================================================
export interface FilterMeta {
  year?: string;
  month?: string;
  contractor?: string;
  procurementMethod?: string;
  exportedAt?: string;
}

export const exportFilteredContracts = async (contracts: any[], meta: FilterMeta = {}) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Danh sách Hợp đồng');

  const exportDate = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  // ─── Tiêu đề báo cáo ─────────────────────────────────────────────
  const totalCols = 12;
  sheet.mergeCells(`A1:L1`);
  sheet.getCell('A1').value = 'PVOIL ĐÌNH VŨ — BÁO CÁO DANH SÁCH HỢP ĐỒNG';
  sheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF1E3A8A' } };
  sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 28;

  sheet.mergeCells('A2:L2');
  const filterDesc = [
    meta.year && meta.year !== 'all' ? `Năm: ${meta.year}` : '',
    meta.month && meta.month !== 'all' ? `Tháng: ${meta.month}` : '',
    meta.contractor ? `Nhà thầu: ${meta.contractor}` : '',
    meta.procurementMethod ? `Hình thức: ${meta.procurementMethod}` : '',
  ].filter(Boolean).join(' | ');
  sheet.getCell('A2').value = filterDesc
    ? `Bộ lọc: ${filterDesc}    •    Ngày xuất: ${exportDate}    •    Tổng: ${contracts.length} hợp đồng`
    : `Ngày xuất: ${exportDate}    •    Tổng: ${contracts.length} hợp đồng`;
  sheet.getCell('A2').font = { size: 10, color: { argb: 'FF64748B' }, italic: true };
  sheet.getCell('A2').alignment = { horizontal: 'center' };

  // ─── Header cột ──────────────────────────────────────────────────
  const headers = [
    'STT', 'Số Hợp đồng', 'Tên / Nội dung HĐ', 'Ngày ký',
    'Nhà thầu', 'Giá trị (VNĐ)', 'Hình thức thầu', 'Mã KH',
    'Ngày hết hạn', 'Tiền tạm ứng', 'Đã thanh toán', 'Còn lại',
  ];
  const headerRow = sheet.getRow(4);
  headerRow.values = headers;
  headerRow.height = 28;
  headers.forEach((_, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { bottom: { style: 'medium', color: { argb: 'FF1E40AF' } } };
  });
  // Highlight cột tài chính
  ['F', 'J', 'K', 'L'].forEach(col => {
    sheet.getCell(`${col}4`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
  });

  // Độ rộng cột
  sheet.columns = [
    { key: 'stt', width: 6 }, { key: 'num', width: 22 }, { key: 'name', width: 42 },
    { key: 'date', width: 14 }, { key: 'contractor', width: 36 }, { key: 'value', width: 20 },
    { key: 'method', width: 28 }, { key: 'planId', width: 18 },
    { key: 'expiry', width: 16 }, { key: 'advance', width: 18 },
    { key: 'paid', width: 18 }, { key: 'remaining', width: 18 },
  ];

  // ─── Dữ liệu ─────────────────────────────────────────────────────
  let totalValue = 0, totalAdvance = 0, totalPaid = 0;

  contracts.forEach((c, idx) => {
    const installments: any[] = c.thanh_toan_dot || [];
    const paid = installments
      .filter(i => i.trang_thai === 'Đã chi')
      .reduce((s, i) => s + (Number(i.so_tien) || 0), 0);
    const value = Number(c.value) || 0;
    const advance = Number(c.tien_tam_ung) || 0;
    const remaining = value - advance - paid;

    totalValue += value;
    totalAdvance += advance;
    totalPaid += paid;

    const rowIdx = idx + 5;
    const row = sheet.getRow(rowIdx);
    row.values = [
      idx + 1, c.contractNumber, c.tenHopDong || '', c.date || '',
      c.contractor || '', value, c.procurement_method || '',
      c.planId || '', c.ngay_het_han || '', advance, paid, remaining,
    ];
    row.height = 18;

    // Format số tiền
    ['F', 'J', 'K', 'L'].forEach(col => {
      const cell = sheet.getCell(`${col}${rowIdx}`);
      cell.numFmt = '#,##0';
      cell.font = { color: { argb: col === 'L' ? 'FF1D4ED8' : 'FF334155' } };
    });

    // Màu nền xen kẽ
    if (idx % 2 === 0) {
      row.eachCell({ includeEmpty: true }, cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      });
    }

    // Cảnh báo hết hạn — màu đỏ
    if (c.ngay_het_han) {
      const today = new Date(); today.setHours(0,0,0,0);
      const expiry = new Date(c.ngay_het_han);
      const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
      if (daysLeft <= 5) {
        sheet.getCell(`I${rowIdx}`).font = { bold: true, color: { argb: 'FFDC2626' } };
        sheet.getCell(`I${rowIdx}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
      }
    }
  });

  // ─── Dòng Tổng cộng ──────────────────────────────────────────────
  const totalRow = contracts.length + 5;
  sheet.mergeCells(`A${totalRow}:E${totalRow}`);
  sheet.getCell(`A${totalRow}`).value = `TỔNG CỘNG (${contracts.length} hợp đồng)`;
  sheet.getCell(`A${totalRow}`).font = { bold: true, size: 11, color: { argb: 'FF1E3A8A' } };
  sheet.getCell(`A${totalRow}`).alignment = { horizontal: 'right' };

  [
    { col: 'F', val: totalValue },
    { col: 'J', val: totalAdvance },
    { col: 'K', val: totalPaid },
    { col: 'L', val: totalValue - totalAdvance - totalPaid },
  ].forEach(({ col, val }) => {
    const cell = sheet.getCell(`${col}${totalRow}`);
    cell.value = val;
    cell.numFmt = '#,##0';
    cell.font = { bold: true, size: 11, color: { argb: 'FF1E3A8A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
    cell.border = { top: { style: 'medium', color: { argb: 'FF1D4ED8' } } };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filters = [
    meta.year !== 'all' ? meta.year : '',
    meta.contractor ? meta.contractor.substring(0, 10) : '',
  ].filter(Boolean).join('_');
  saveAs(blob, `BaoCao_HopDong${filters ? '_' + filters : ''}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// ============================================================
// exportFilteredInvoices — Xuất hóa đơn theo bộ lọc hiện tại
// ============================================================
export const exportFilteredInvoices = async (invoices: any[], meta: FilterMeta = {}) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Danh sách Hóa đơn');

  const exportDate = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  // ─── Tiêu đề báo cáo ─────────────────────────────────────────────
  sheet.mergeCells(`A1:I1`);
  sheet.getCell('A1').value = 'PVOIL ĐÌNH VŨ — BÁO CÁO DANH SÁCH HÓA ĐƠN';
  sheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF059669' } }; // Emerald
  sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 28;

  sheet.mergeCells('A2:I2');
  const filterDesc = [
    meta.year && meta.year !== 'all' ? `Năm: ${meta.year}` : '',
    meta.month && meta.month !== 'all' ? `Tháng: ${meta.month}` : '',
    meta.contractor ? `Đơn vị xuất: ${meta.contractor}` : '',
  ].filter(Boolean).join(' | ');
  
  sheet.getCell('A2').value = filterDesc
    ? `Bộ lọc: ${filterDesc}    •    Ngày xuất: ${exportDate}    •    Tổng: ${invoices.length} hóa đơn`
    : `Ngày xuất: ${exportDate}    •    Tổng: ${invoices.length} hóa đơn`;
  sheet.getCell('A2').font = { size: 10, color: { argb: 'FF64748B' }, italic: true };
  sheet.getCell('A2').alignment = { horizontal: 'center' };

  // ─── Header cột ──────────────────────────────────────────────────
  const headers = [
    'STT', 'Số Hóa đơn', 'Ngày lập', 'Đơn vị xuất', 
    'Trước Thuế (VNĐ)', 'Tiền Thuế (VNĐ)', 'Sau Thuế (VNĐ)', 
    'Mã KH', 'Phòng ban thực hiện'
  ];
  const headerRow = sheet.getRow(4);
  headerRow.values = headers;
  headerRow.height = 28;
  headers.forEach((_, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { bottom: { style: 'medium', color: { argb: 'FF047857' } } };
  });

  // Độ rộng cột
  sheet.columns = [
    { key: 'stt', width: 6 }, { key: 'invoiceNumber', width: 22 }, 
    { key: 'date', width: 16 }, { key: 'sellerName', width: 42 }, 
    { key: 'preTax', width: 20 }, { key: 'tax', width: 18 }, { key: 'postTax', width: 20 },
    { key: 'planId', width: 22 }, { key: 'phongBan', width: 28 }
  ];

  // ─── Dữ liệu ─────────────────────────────────────────────────────
  let totalPreTax = 0, totalTax = 0, totalPostTax = 0;

  const formatDateString = (dateStr: string) => {
    if (!dateStr) return '';
    const cleaned = dateStr.trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleaned)) return cleaned;
    try {
      const d = new Date(cleaned);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${day}/${month}/${d.getFullYear()}`;
      }
    } catch (e) {}
    return dateStr;
  };

  invoices.forEach((inv, idx) => {
    const preTax = Number(inv.giaTriTruocThue) || 0;
    const tax = Number(inv.tienThue) || 0;
    const postTax = Number(inv.giaTriSauThue) || 0;

    totalPreTax += preTax;
    totalTax += tax;
    totalPostTax += postTax;

    const rowIdx = idx + 5;
    const row = sheet.getRow(rowIdx);
    row.values = [
      idx + 1, inv.invoiceNumber, formatDateString(inv.date || ''), inv.sellerName || '',
      preTax, tax, postTax, inv.planId || '', inv.phongBan || ''
    ];
    row.height = 18;

    // Format số tiền
    ['E', 'F', 'G'].forEach(col => {
      const cell = sheet.getCell(`${col}${rowIdx}`);
      cell.numFmt = '#,##0';
      cell.font = { color: { argb: col === 'G' ? 'FF059669' : 'FF334155' } };
    });

    if (idx % 2 === 0) {
      row.eachCell({ includeEmpty: true }, cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      });
    }
  });

  // ─── Dòng Tổng cộng ──────────────────────────────────────────────
  const totalRow = invoices.length + 5;
  sheet.mergeCells(`A${totalRow}:D${totalRow}`);
  sheet.getCell(`A${totalRow}`).value = `TỔNG CỘNG (${invoices.length} hóa đơn)`;
  sheet.getCell(`A${totalRow}`).font = { bold: true, size: 11, color: { argb: 'FF065F46' } };
  sheet.getCell(`A${totalRow}`).alignment = { horizontal: 'right' };

  [
    { col: 'E', val: totalPreTax },
    { col: 'F', val: totalTax },
    { col: 'G', val: totalPostTax },
  ].forEach(({ col, val }) => {
    const cell = sheet.getCell(`${col}${totalRow}`);
    cell.value = val;
    cell.numFmt = '#,##0';
    cell.font = { bold: true, size: 11, color: { argb: 'FF065F46' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
    cell.border = { top: { style: 'medium', color: { argb: 'FF059669' } } };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filtersStr = [
    meta.year !== 'all' ? meta.year : '',
    meta.contractor ? meta.contractor.substring(0, 10) : '',
  ].filter(Boolean).join('_');
  saveAs(blob, `BaoCao_HoaDon${filtersStr ? '_' + filtersStr : ''}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// ============================================================
// exportVendors — Xuất danh bạ nhà thầu
// ============================================================
export const exportVendors = async (vendors: any[]) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Danh bạ Nhà thầu');

  const exportDate = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  // ─── Tiêu đề báo cáo ─────────────────────────────────────────────
  sheet.mergeCells(`A1:G1`);
  sheet.getCell('A1').value = 'PVOIL ĐÌNH VŨ — DANH BẠ NHÀ THẦU';
  sheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF2563EB' } }; // Blue-600
  sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 28;

  sheet.mergeCells('A2:G2');
  sheet.getCell('A2').value = `Ngày xuất: ${exportDate}    •    Tổng: ${vendors.length} nhà thầu`;
  sheet.getCell('A2').font = { size: 10, color: { argb: 'FF64748B' }, italic: true };
  sheet.getCell('A2').alignment = { horizontal: 'center' };

  // ─── Header cột ──────────────────────────────────────────────────
  const headers = [
    'STT', 'Tên nhà thầu (Chuẩn hóa)', 'Mã số thuế', 'Địa chỉ', 
    'Người đại diện', 'Số điện thoại', 'Ngành nghề', 'Số lượng Hợp đồng', 'Số lượng Hóa đơn'
  ];
  const headerRow = sheet.getRow(4);
  headerRow.values = headers;
  headerRow.height = 28;
  headers.forEach((_, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { bottom: { style: 'medium', color: { argb: 'FF1D4ED8' } } };
  });

  // Độ rộng cột
  sheet.columns = [
    { key: 'stt', width: 6 }, { key: 'name', width: 50 }, 
    { key: 'taxCode', width: 16 }, { key: 'address', width: 50 }, 
    { key: 'rep', width: 20 }, { key: 'phone', width: 15 }, { key: 'sector', width: 25 },
    { key: 'cCount', width: 18 }, { key: 'iCount', width: 18 }
  ];

  // ─── Dữ liệu ─────────────────────────────────────────────────────
  vendors.forEach((v, idx) => {
    const rowIdx = idx + 5;
    const row = sheet.getRow(rowIdx);
    row.values = [
      idx + 1, v.name, v.taxCode, v.address, v.representative,
      v.phoneNumber || '', v.businessSector || '',
      v.contractCount, v.invoiceCount
    ];
    row.height = 20;

    row.getCell(8).alignment = { horizontal: 'center' };
    row.getCell(9).alignment = { horizontal: 'center' };

    if (idx % 2 === 0) {
      row.eachCell({ includeEmpty: true }, cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      });
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `DanhBa_NhaThau_${new Date().toISOString().split('T')[0]}.xlsx`);
};
