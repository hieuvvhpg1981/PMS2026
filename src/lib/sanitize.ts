/**
 * Safe conversion utilities to prevent Minified React Error #31 and string comparison crashes.
 */

export function safeString(val: any, fallback: string = ''): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return String(val);
  
  // If it's an object/array, we cannot render it directly as a React child.
  // We serialize it to avoid crashing the screen.
  try {
    return JSON.stringify(val);
  } catch (e) {
    return fallback;
  }
}

export function safeNumber(val: any, fallback: number = 0): number {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'number') return val;
  const num = Number(val);
  return isNaN(num) ? fallback : num;
}

export interface SanitizedPlan {
  id: string;
  planId: string;
  appendix: string;
  phuLuc: string;
  costItem: string;
  description: string;
  budget: number;
  departmentName: string;
  theoQuyetDinh: string;
  namKeHoach: number;
  level?: number;
  parentPlanId?: string;
  additional_info: Record<string, any>;
}

export function sanitizePlan(docId: string, data: any): SanitizedPlan {
  if (!data) data = {};
  
  // Clean slash character '/' into hyphen '-' in planId
  let rawPlanId = safeString(data.planId || data.makh || '');
  rawPlanId = rawPlanId.replace(/\//g, '-');

  const appendixStr = safeString(data.appendix || data.phuLuc || data.phuluc || '');

  // Extract additional info, ensuring it doesn't contain un-renderable React objects
  const rawAdditionalInfo = data.additional_info || {};
  const cleanedAdditionalInfo: Record<string, any> = {};
  if (typeof rawAdditionalInfo === 'object' && rawAdditionalInfo !== null) {
    Object.keys(rawAdditionalInfo).forEach(key => {
      cleanedAdditionalInfo[key] = safeString(rawAdditionalInfo[key]);
    });
  }

  return {
    id: safeString(docId),
    planId: rawPlanId,
    appendix: appendixStr,
    phuLuc: appendixStr, // Keep both for backward compatibility
    costItem: safeString(data.costItem || data.khoanmuc || ''),
    description: safeString(data.description || data.noidung || ''),
    budget: safeNumber(data.budget || data.kinhphi || 0),
    departmentName: safeString(data.departmentName || data.phongban || data.phongBan || ''),
    theoQuyetDinh: safeString(data.theoQuyetDinh || data.quyetdinh || ''),
    namKeHoach: safeNumber(data.namKeHoach || data.year || data.nam || new Date().getFullYear()),
    level: data.level !== undefined ? safeNumber(data.level) : undefined,
    parentPlanId: data.parentPlanId !== undefined ? safeString(data.parentPlanId) : undefined,
    additional_info: cleanedAdditionalInfo
  };
}

export function sanitizeContract(docId: string, data: any): any {
  if (!data) data = {};

  const installments = Array.isArray(data.thanh_toan_dot) ? data.thanh_toan_dot : [];
  const cleanedInstallments = installments.map((dot: any) => ({
    so_tien: safeNumber(dot?.so_tien),
    ngay_du_kien: safeString(dot?.ngay_du_kien),
    trang_thai: safeString(dot?.trang_thai, 'Chưa chi')
  }));

  return {
    id: safeString(docId),
    contractNumber: safeString(data.contractNumber || ''),
    tenHopDong: safeString(data.tenHopDong || ''),
    date: safeString(data.date || ''),
    contractor: safeString(data.contractor || ''),
    thoi_han_hd: safeNumber(data.thoi_han_hd || null),
    ngay_ket_thuc: safeString(data.ngay_ket_thuc || ''),
    value: safeNumber(data.value || 0),
    procurement_method: safeString(data.procurement_method || ''),
    planDocId: safeString(data.planDocId || ''),
    planId: safeString(data.planId || '').replace(/\//g, '-'),
    ngay_het_han: safeString(data.ngay_het_han || ''),
    tien_tam_ung: safeNumber(data.tien_tam_ung || 0),
    thanh_toan_dot: cleanedInstallments,
    phongBan: safeString(data.phongBan || ''),
    createdBy: safeString(data.createdBy || ''),
    createdAt: safeString(data.createdAt || ''),
    updatedBy: safeString(data.updatedBy || ''),
    updatedAt: safeString(data.updatedAt || ''),
    filePath: safeString(data.filePath || '')
  };
}

export function sanitizeInvoice(docId: string, data: any): any {
  if (!data) data = {};
  return {
    id: safeString(docId),
    invoiceNumber: safeString(data.invoiceNumber || ''),
    date: safeString(data.date || ''),
    giaTriTruocThue: safeNumber(data.giaTriTruocThue || 0),
    tienThue: safeNumber(data.tienThue || 0),
    giaTriSauThue: safeNumber(data.giaTriSauThue || 0),
    sellerName: safeString(data.sellerName || ''),
    planDocId: safeString(data.planDocId || ''),
    planId: safeString(data.planId || '').replace(/\//g, '-'),
    contractId: safeString(data.contractId || ''),
    phongBan: safeString(data.phongBan || ''),
    createdBy: safeString(data.createdBy || ''),
    createdAt: safeString(data.createdAt || ''),
    updatedBy: safeString(data.updatedBy || ''),
    updatedAt: safeString(data.updatedAt || ''),
    filePath: safeString(data.filePath || '')
  };
}

export function sanitizeMonthlyRegistration(docId: string, data: any): any {
  if (!data) data = {};
  return {
    id: safeString(docId),
    planDocId: safeString(data.planDocId || ''),
    planId: safeString(data.planId || '').replace(/\//g, '-'),
    year: safeNumber(data.year || new Date().getFullYear()),
    month: safeNumber(data.month || 1),
    amount: safeNumber(data.amount || 0),
    phongBan: safeString(data.phongBan || ''),
    updatedBy: safeString(data.updatedBy || ''),
    updatedAt: safeString(data.updatedAt || '')
  };
}
