// ============================================================
// EmailJS Configuration — PVOIL Đình Vũ
// ============================================================
// Hướng dẫn thiết lập MIỄN PHÍ (200 email/tháng):
//
// 1. Vào https://www.emailjs.com/ → Đăng ký miễn phí
// 2. Add Email Service → chọn Gmail → Connect Account (đăng nhập Gmail của bạn)
// 3. Vào Email Templates → Create New Template
//    - Template content gợi ý:
//      Subject: ⚠️ Hợp đồng {{contract_number}} sắp hết hạn (còn {{days_left}} ngày)
//      Body: Hợp đồng {{contract_number}} - {{contract_name}} với nhà thầu {{contractor}}
//            sẽ hết hạn vào ngày {{expiry_date}}. Vui lòng xử lý kịp thời.
// 4. Vào Account → General → lấy Public Key
// 5. Điền thông tin vào bên dưới:
// ============================================================

export const EMAILJS_CONFIG = {
  SERVICE_ID:  'service_cikck3n',
  TEMPLATE_ID: 'template_xl27a3e',
  PUBLIC_KEY:  'nzamcEXZqyyiwv8X5',
};

// Tự động phát hiện đã cấu hình hay chưa (so sánh với giá trị mặc định placeholder)
export const EMAILJS_IS_CONFIGURED =
  EMAILJS_CONFIG.SERVICE_ID  !== 'YOUR_SERVICE_ID' &&
  EMAILJS_CONFIG.TEMPLATE_ID !== 'YOUR_TEMPLATE_ID' &&
  EMAILJS_CONFIG.PUBLIC_KEY  !== 'YOUR_PUBLIC_KEY';
