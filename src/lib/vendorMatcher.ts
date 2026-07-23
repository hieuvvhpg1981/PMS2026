export interface Vendor {
  vendorId: string;
  name: string;
  taxCode: string;
  address: string;
  representative: string;
  contractCount: number;
  invoiceCount: number;
  phoneNumber?: string;
  businessSector?: string;
}

export const normalizeContractorName = (name: string): string => {
  if (!name) return '';
  let normalized = name.toUpperCase().trim();
  // Thay thế các từ viết tắt phổ biến
  normalized = normalized.replace(/\bCP\b/g, 'CỔ PHẦN');
  normalized = normalized.replace(/\bTNHH\b/g, 'TRÁCH NHIỆM HỮU HẠN');
  normalized = normalized.replace(/\bCTY\b/g, 'CÔNG TY');
  // Loại bỏ khoảng trắng thừa
  normalized = normalized.replace(/\s+/g, ' ');
  return normalized;
};

// Thuật toán khoảng cách Levenshtein cơ bản
const levenshtein = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
};

export const calculateSimilarity = (str1: string, str2: string): number => {
  if (!str1 || !str2) return 0;
  const s1 = normalizeContractorName(str1);
  const s2 = normalizeContractorName(str2);
  const distance = levenshtein(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  if (maxLength === 0) return 100;
  return ((maxLength - distance) / maxLength) * 100;
};

export const groupVendors = (contracts: any[], invoices: any[], vendorsDB: any[] = []): Vendor[] => {
  const vendorsMap: Record<string, Vendor> = {};

  // Hàm hỗ trợ gom nhóm
  const addOrUpdateVendor = (
    name: string,
    taxCode: string,
    address: string,
    representative: string,
    isContract: boolean
  ) => {
    const normName = normalizeContractorName(name);
    if (!normName && !taxCode) return;

    // Tìm xem đã có vendor nào khớp chưa (ưu tiên taxCode, sau đó là similarity > 85%)
    let matchedId = '';
    
    // 1. Tìm theo taxCode
    if (taxCode) {
      const existingKey = Object.keys(vendorsMap).find(k => vendorsMap[k].taxCode === taxCode);
      if (existingKey) matchedId = existingKey;
    }
    
    // 2. Nếu chưa có, tìm theo tên (độ tương đồng > 85%)
    if (!matchedId) {
      const existingKey = Object.keys(vendorsMap).find(k => {
        const existingVendor = vendorsMap[k];
        // Nếu record hiện tại không có taxCode hoặc existingVendor không có taxCode, match bằng tên
        if (!taxCode || !existingVendor.taxCode) {
          return calculateSimilarity(existingVendor.name, name) > 85;
        }
        return false;
      });
      if (existingKey) matchedId = existingKey;
    }

    if (matchedId) {
      const v = vendorsMap[matchedId];
      if (isContract) {
        v.contractCount += 1;
        if (!v.representative && representative) v.representative = representative;
      } else {
        v.invoiceCount += 1;
      }
      
      // Ưu tiên dữ liệu từ Hóa đơn (thường chuẩn hơn) hoặc ghi đè nếu dữ liệu cũ trống
      if (!isContract) {
        v.name = normName; // Cập nhật tên theo hóa đơn
        if (taxCode) v.taxCode = taxCode;
        if (address) v.address = address;
      } else {
        // Dữ liệu hợp đồng, chỉ ghi nếu đang trống
        if (!v.taxCode && taxCode) v.taxCode = taxCode;
        if (!v.address && address) v.address = address;
      }
    } else {
      // Tạo mới
      // Encode name to hex to create a safe deterministic ID if taxCode is missing
      const safeNameHex = Array.from(normName).map(c => c.charCodeAt(0).toString(16)).join('');
      const newId = taxCode || `VENDOR_NAME_${safeNameHex}`;
      vendorsMap[newId] = {
        vendorId: newId,
        name: normName,
        taxCode: taxCode || '',
        address: address || '',
        representative: representative || '',
        contractCount: isContract ? 1 : 0,
        invoiceCount: isContract ? 0 : 1,
      };
    }
  };

  // Duyệt hợp đồng trước
  contracts.forEach(c => {
    addOrUpdateVendor(c.contractor, c.taxCode, c.address, c.representative, true);
  });

  // Duyệt hóa đơn sau (sẽ ghi đè tên chuẩn nếu match)
  invoices.forEach(i => {
    addOrUpdateVendor(i.sellerName, i.taxCode, i.address, '', false);
  });

  // Đắp dữ liệu từ vendorsDB (do người dùng sửa/thêm thủ công)
  vendorsDB.forEach(dbv => {
    if (vendorsMap[dbv.id]) {
      const v = vendorsMap[dbv.id];
      if (dbv.name) v.name = dbv.name;
      if (dbv.taxCode) v.taxCode = dbv.taxCode;
      if (dbv.address) v.address = dbv.address;
      if (dbv.representative) v.representative = dbv.representative;
      if (dbv.phoneNumber) v.phoneNumber = dbv.phoneNumber;
      if (dbv.businessSector) v.businessSector = dbv.businessSector;
    }
  });

  // Chuyển map thành mảng và sắp xếp theo tên
  return Object.values(vendorsMap).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
};
