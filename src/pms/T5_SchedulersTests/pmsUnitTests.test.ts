/**
 * T5 - UNIT TEST SUITE (TDD)
 * Chạy giả lập kiểm thử tự động cho các logic core của PMS 2026.
 * Có thể thực thi trực tiếp qua terminal bằng: npx tsx src/pms/T5_SchedulersTests/pmsUnitTests.test.ts
 */

import { PmsService, UserService } from '../T2_Services';
import { ProjectGroup, ConstructionGrade, ApprovalStatus, GpmbStatus, db, MASTER_WORKFLOW_TEMPLATES_2026 } from '../T0_Config';
import { safeNumber, safeString, formatVND, validateRequiredAttachments, checkEstimateExceedsTMDT, parseExcelArrayBufferToJSON, updateBoqRow, recalculateTotalBudget, calculateBiddingSavings, validateRequiredAttachmentsStage3, validatePackageDisbursement, canUserAccessProject, filterProjectsForUser, uploadToUserPersonalDrive, shareDriveFolderWithUsers, verifyGoogleDriveConnection, decodeGoogleJwt, matchUserRole, authenticateUserCredentials, updateUserAccountInSystem, evaluateCostOverrunRisk206, calculateIpcNetPayment210, validateContractorAndCchn212, evaluateSequentialWorkflowLock, verifyElectronicCertifiedFile, formatCurrencyInputMask, parseCurrencyInputMask, formatStatusOrCodeVN, computeDeterministicSha256, verifyStoredFileIntegrity, validateConcurrentMultiFormatUpload, generateZipArchiveStructure } from '../T1_Utils';
import * as XLSX from 'xlsx';

function runPmsUnitTestSuite() {
  console.log('=============== PMS 2026 SYSTEM AUTOMATED UNIT TESTS ===============\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ✅ ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ❌ ${testName}`);
      failed++;
    }
  }

  // --- TEST CASE 1: Auto Routing Engine 4 Branches ---
  console.log('--- TEST 1: Auto Routing Engine 4 Branches ---');
  const routeGroupA = PmsService.autoRouteProjectGroup(950_000_000_000);
  assert(
    routeGroupA.group === ProjectGroup.NHOM_A && routeGroupA.recommendedGrade === ConstructionGrade.CAP_DAC_BIET,
    'Dự án 950 tỷ được tự động định tuyến thành NHÓM_A & CẤP ĐẶC BIỆT'
  );

  const routeGroupB = PmsService.autoRouteProjectGroup(250_000_000_000);
  assert(
    routeGroupB.group === ProjectGroup.NHOM_B && routeGroupB.recommendedGrade === ConstructionGrade.CAP_I,
    'Dự án 250 tỷ được tự động định tuyến thành NHÓM_B & CẤP I'
  );

  const routeGroupC = PmsService.autoRouteProjectGroup(50_000_000_000);
  assert(
    routeGroupC.group === ProjectGroup.NHOM_C && routeGroupC.recommendedGrade === ConstructionGrade.CAP_III,
    'Dự án 50 tỷ được tự động định tuyến thành NHÓM_C & CẤP III'
  );

  const routeBcktkt = PmsService.autoRouteProjectGroup(12_000_000_000, false, true);
  assert(
    routeBcktkt.group === ProjectGroup.BCKTKT && routeBcktkt.isBypassBcnctkt === true,
    'Dự án cải tạo 12 tỷ được tự động định tuyến thành BCKTKT (Thu gọn 1 bước, bỏ qua BCNCTKT)'
  );

  // --- TEST CASE 2: Stage 4 Package-Based Disbursement Hard Block Guardrail ---
  console.log('\n--- TEST 2: Stage 4 Package-Based Disbursement Hard Block Guardrail ---');
  const packageBlockNormal = validatePackageDisbursement('GT-XL-01', 850_000_000_000, 441_300_000_000, 50_000_000_000);
  assert(
    packageBlockNormal.allowed === true && packageBlockNormal.proposedCumulative === 491_300_000_000,
    'Giải ngân Gói thầu XL-01: Lũy kế 491.3 tỷ ≤ Hạn mức HĐ 850 tỷ -> Đạt chấp thuận'
  );

  const packageBlockExceeded = validatePackageDisbursement('GT-TV-01', 14_500_000_000, 8_700_000_000, 7_000_000_000);
  assert(
    packageBlockExceeded.allowed === false && packageBlockExceeded.proposedCumulative === 15_700_000_000,
    'HARD BLOCK GÓI THẦU RÊNG: Khóa đề nghị giải ngân Gói TV-01 vì lũy kế đề xuất 15.7 tỷ VƯỢT Hạn mức HĐ 14.5 tỷ!'
  );

  // --- TEST CASE 3: Stage 3 Bidding Savings Calculator ---
  console.log('\n--- TEST 3: Stage 3 Bidding Savings Calculator ---');
  const biddingSavings = calculateBiddingSavings(910_000_000_000, 880_000_000_000);
  assert(
    biddingSavings.isValid && biddingSavings.savingsAmount === 30_000_000_000 && biddingSavings.savingsPct === 3.3,
    'Tính tỷ lệ tiết kiệm đấu thầu: Giá gói 910 tỷ, Trúng thầu 880 tỷ -> Tiết kiệm 30 tỷ (3.3%)'
  );

  // --- TEST CASE 4: Stage 3 Validate Required Attachments Matrix ---
  console.log('\n--- TEST 4: Stage 3 Validate Required Attachments Matrix ---');
  const stage3DocsCheck = validateRequiredAttachmentsStage3(1, []);
  assert(
    stage3DocsCheck.isComplete === false && stage3DocsCheck.missingDocNames.length === 3,
    'Phát hiện thiếu 3 tài liệu GPMB bắt buộc khi danh sách rỗng'
  );

  // --- TEST CASE 5: Inline Row Edit & Recalculate Utilities ---
  console.log('\n--- TEST 5: Inline Row Edit & Recalculate Utilities ---');
  const mockBoqList = [
    { itemId: 'BOQ-1', quantity: 100, unitPrice: 2000000, totalAmount: 200000000 },
    { itemId: 'BOQ-2', quantity: 50, unitPrice: 1000000, totalAmount: 50000000 }
  ];

  const updatedBoq = updateBoqRow(mockBoqList, 'BOQ-1', { quantity: 150 });
  assert(
    updatedBoq[0].totalAmount === 300000000,
    'Cập nhật dòng Inline: Sửa Khối lượng 100 -> 150 tự động tính lại Thành tiền = 300 triệu'
  );

  const totalNewBudget = recalculateTotalBudget(updatedBoq);
  assert(
    totalNewBudget === 350000000,
    'Tải lại Tổng Dự toán Real-time = 300 tr + 50 tr = 350 triệu'
  );

  // --- TEST CASE 6: SheetJS XLSX Binary Parsing & Column Grid Validation ---
  console.log('\n--- TEST 6: SheetJS XLSX Binary Parsing & Column Grid Validation ---');
  const sampleData = [
    ["MÃ ĐỊNH MỨC", "TÊN CÔNG TÁC / CHI PHÍ", "ĐVT", "KHỐI LƯỢNG", "ĐƠN GIÁ ĐẦU VÀO (VNĐ)", "", "", "THÀNH TIỀN (VNĐ)"],
    ["", "", "", "", "Vật Liệu", "Nhân Công", "Ca Máy", ""],
    ["AF.11110", "Đào đất hố móng bằng máy 0.8m3", "m3", 150, 0, 45000, 25000, 10500000],
    ["AB.22100", "Bê tông móng M250 đá 1x2", "m3", 45, 1250000, 180000, 50000, 66600000]
  ];
  const ws = XLSX.utils.aoa_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "BOQ");
  const binaryBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const parsedBinary = parseExcelArrayBufferToJSON(binaryBuffer, 'BOQ');
  assert(
    parsedBinary.parsedData.length === 2 && parsedBinary.parsedData[0].totalAmount === 10500000,
    'SheetJS XLSX Binary Parsing thành công: Tách chuẩn cột Cột A (AF.11110), Cột B (Đào đất), Cột H (10.5 triệu)'
  );

  // --- TEST CASE 7: Stage 2 Cross-check Alert (BOQ > TMĐT) ---
  console.log('\n--- TEST 7: Stage 2 Cross-check Alert (BOQ > TMĐT) ---');
  const boqCheckNormal = checkEstimateExceedsTMDT(850_000_000_000, 950_000_000_000);
  assert(
    boqCheckNormal.isExceeded === false,
    'Dự toán BOQ (850 tỷ) ≤ TMĐT (950 tỷ) -> Đạt kiểm tra chép ngân sách'
  );

  const boqCheckExceeded = checkEstimateExceedsTMDT(1_050_000_000_000, 950_000_000_000);
  assert(
    boqCheckExceeded.isExceeded === true && boqCheckExceeded.exceededAmount === 100_000_000_000,
    'CROSS-CHECK ALERT: Phát hiện Dự toán BOQ (1.050 tỷ) vượt TMĐT đã duyệt (950 tỷ) một lượng +100 tỷ'
  );

  // --- TEST CASE 8: Safe Math & String Utilities ---
  console.log('\n--- TEST 8: Safe Utilities & Number formatting ---');
  assert(safeNumber(undefined) === 0, 'safeNumber(undefined) trả về 0');
  assert(safeNumber("1500000") === 1500000, 'safeNumber("1500000") chuyển đổi chuỗi số chuẩn');
  assert(safeString(null) === '', 'safeString(null) trả về chuỗi rỗng rỗng');
  assert(formatVND(1000000).includes('1.000.000'), 'formatVND(1000000) chứa định dạng Việt Nam "1.000.000"');

  // --- TEST CASE 9: User RBAC & Row-Level Access Security ---
  console.log('\n--- TEST 9: User RBAC & Row-Level Access Security ---');
  const sampleProject = {
    PROJECT_ID: 'DA-TEST-001',
    TEN_DU_AN: 'Dự án Cầu Giao Thoa 01',
    ownerEmail: 'hieuvv@company.com',
    assignedEmails: ['kethoath@company.com', 'ketoan@company.com']
  };

  assert(
    canUserAccessProject(sampleProject, 'hieuvv@company.com', 'PROJECT_MANAGER') === true,
    'Trưởng dự án (Owner hieuvv@company.com) được phép truy cập dự án'
  );
  assert(
    canUserAccessProject(sampleProject, 'kethoath@company.com', 'MEMBER') === true,
    'Thành viên được cấp quyền (kethoath@company.com) được phép truy cập dự án'
  );
  assert(
    canUserAccessProject(sampleProject, 'stranger@otherdomain.com', 'VIEWER') === false,
    'Tài khoản lạ (stranger@otherdomain.com) KHÔNG ĐƯỢC PHÉP TRUY CẬP (Hard Block)'
  );
  assert(
    canUserAccessProject(sampleProject, 'anyuser@gov.vn', 'ADMIN') === true,
    'Quản trị viên (ADMIN) truy cập được tất cả dự án'
  );

  const mockProjectList = [
    { PROJECT_ID: 'DA-01', ownerEmail: 'hieuvv@company.com', assignedEmails: [] },
    { PROJECT_ID: 'DA-02', ownerEmail: 'truongduan@company.com', assignedEmails: ['hieuvv@company.com'] },
    { PROJECT_ID: 'DA-03', ownerEmail: 'other@company.com', assignedEmails: ['someone@company.com'] }
  ];
  const filteredForHieu = filterProjectsForUser(mockProjectList, 'hieuvv@company.com', 'PROJECT_MANAGER');
  assert(
    filteredForHieu.length === 2 && filteredForHieu.some(p => p.PROJECT_ID === 'DA-01') && filteredForHieu.some(p => p.PROJECT_ID === 'DA-02'),
    'Header dropdown lọc chính xác 2 dự án (DA-01 owner và DA-02 assigned) cho hieuvv@company.com'
  );

  // --- TEST CASE 10: Google Drive Storage & Permissions Sync ---
  console.log('\n--- TEST 10: Google Drive Storage & Permissions Sync ---');
  const driveUpload = uploadToUserPersonalDrive({ name: 'HoSo_BVTC_DauThau.pdf', size: 1024000 }, 'DA-2026-001', 'hieuvv@company.com');
  assert(
    driveUpload.status === 'DRIVE_SYNC_SUCCESS' && driveUpload.driveWebLink.includes('drive.google.com'),
    'Tải file lên Google Drive cá nhân thành công: Sinh link tham chiếu web https://drive.google.com/file/d/...'
  );

  const driveShare = shareDriveFolderWithUsers('DA-2026-001', ['kethoath@company.com', 'ketoan@company.com'], 'writer');
  assert(
    driveShare.success === true && driveShare.syncedCount === 2,
    'Google Drive Permissions API đồng bộ cấp quyền truy cập Thư mục dự án thành công cho 2 Email'
  );

  // --- TEST CASE 11: Admin System Settings & Drive Connection Verification ---
  console.log('\n--- TEST 11: Admin System Settings & Drive Connection Verification ---');
  const systemSettings = PmsService.getSystemSettings();
  assert(
    systemSettings.driveRootFolderId !== undefined && systemSettings.driveBaseFolderName === 'PMS_Storage_UserProjects',
    'Khởi tạo và truy vấn Cấu hình Hệ thống Admin (SystemSettings) thành công từ Storage'
  );

  const driveConnectionTest = verifyGoogleDriveConnection(systemSettings.driveRootFolderId);
  assert(
    driveConnectionTest.success === true && driveConnectionTest.status === 'DRIVE_OAUTH_CONNECTED',
    'Xác thực kết nối Google Drive API thành công: Quota 15GB khả dụng, Thư mục gốc kết nối ổn định'
  );

  // --- TEST CASE 12: Google JWT Decoding, Token Expiration Check & Auth Guard Session ---
  console.log('\n--- TEST 12: Google JWT Decoding, Token Expiration & Auth Guard Session ---');
  const dummyJwtPayload = decodeGoogleJwt('');
  assert(
    dummyJwtPayload.email === 'user@company.com' && dummyJwtPayload.name === 'Google User',
    'Giải mã Token JWT Google an toàn với cấu trúc thông tin email & name'
  );

  const matchedProfile = matchUserRole('admin@pms2026.gov.vn');
  assert(
    matchedProfile.role === 'ADMIN' && matchedProfile.name.includes('Quản Trị Viên'),
    'Đối chiếu Email đăng nhập với CSDL gán đúng vai trò ADMIN cho admin@pms2026.gov.vn'
  );

  // Expiration check test
  const expiredTestUser = {
    email: 'expired@company.com',
    name: 'Expired User',
    role: 'MEMBER',
    avatarUrl: '',
    department: 'Test Dept',
    googleDriveConnected: true,
    exp: Math.floor(Date.now() / 1000) - 10 // 10 seconds in the past (EXPIRED)
  };
  PmsService.setStoredAuthUser(expiredTestUser);
  const checkedUserAfterExp = PmsService.getStoredAuthUser();
  assert(
    checkedUserAfterExp === null,
    'Ktra Token JWT hết hạn: F5 với exp trong quá khứ ➔ Tự động clearStoredAuthUser() và trả về null (Đá về trang Login)'
  );

  // --- TEST CASE 13: Simple Credentials Authentication & Error Validation ---
  console.log('\n--- TEST 13: Simple Credentials Authentication & Error Validation ---');
  const validAuth = authenticateUserCredentials('admin@pms2026.gov.vn', 'admin123');
  assert(
    validAuth.success === true && validAuth.user?.role === 'ADMIN',
    'Xác thực thành công tài khoản nội bộ admin@pms2026.gov.vn / admin123 ➔ Gán vai trò ADMIN'
  );

  const validPmAuth = authenticateUserCredentials('hieuvv@company.com', '123456');
  assert(
    validPmAuth.success === true && validPmAuth.user?.role === 'PROJECT_MANAGER',
    'Xác thực thành công hieuvv@company.com / 123456 ➔ Gán vai trò PROJECT_MANAGER'
  );

  const invalidPassAuth = authenticateUserCredentials('admin@pms2026.gov.vn', 'wrongpass999');
  assert(
    invalidPassAuth.success === false && invalidPassAuth.message.includes('Email hoặc mật khẩu không chính xác'),
    'Báo lỗi chính xác khi nhập sai Mật khẩu: ❌ Email hoặc mật khẩu không chính xác. Vui lòng liên hệ Admin để cấp tài khoản!'
  );

  // --- TEST CASE 14: Admin User Account Editing, Password Reset & Status Toggle ---
  console.log('\n--- TEST 14: Admin User Account Editing, Password Reset & Status Toggle ---');
  const userAccounts = PmsService.getUserAccounts();
  const targetUser = userAccounts[1]; // hieuvv@company.com

  const updatedResult = updateUserAccountInSystem(
    targetUser.id,
    { fullName: 'Vũ Văn Hiếu (Trưởng Dự Án)', passwordHash: 'newpass2026' },
    userAccounts
  );
  assert(
    updatedResult.success === true && updatedResult.updatedAccounts[1].fullName === 'Vũ Văn Hiếu (Trưởng Dự Án)',
    'Hàm updateUserAccountInSystem cập nhật thông tin tên hiển thị & mật khẩu mới thành công'
  );

  // Password reset test
  PmsService.resetUserPassword(targetUser.id, '123456');
  const recheckedAccounts = PmsService.getUserAccounts();
  const resetUser = recheckedAccounts.find(a => a.id === targetUser.id);
  assert(
    resetUser?.passwordHash === '123456',
    'Reset mật khẩu tài khoản về mặc định 123456 thành công'
  );

  // --- TEST CASE 15: Firebase Firestore Service & Environment Config Integrity ---
  console.log('\n--- TEST 15: Firebase Firestore Service & Environment Config Integrity ---');
  assert(
    db !== undefined && typeof db.app.name === 'string',
    'Khởi tạo Firebase App & Firestore db trong T0_Config/firebase.ts thành công từ .env'
  );
  assert(
    typeof UserService.fetchUsersFromFirestore === 'function' && typeof UserService.authenticateUserFirestore === 'function',
    'UserService cung cấp đầy đủ các API bất đồng bộ (fetchUsersFromFirestore, authenticateUserFirestore, saveUserProfileToFirestore)'
  );

  // --- TEST CASE 16: 2026 Construction Investment Legal Decrees (NĐ 217, 206, 210, 212, 207, 209) ---
  console.log('\n--- TEST 16: 2026 Construction Investment Legal Decrees Compliance ---');
  const routeSpecialArea60B = PmsService.autoRouteProjectGroup(60_000_000_000, false, false, true);
  assert(
    routeSpecialArea60B.group === ProjectGroup.BCKTKT && routeSpecialArea60B.designStepsCount === 1,
    'NĐ 217/2026: Dự án 60 tỷ tại Vùng đặc biệt khó khăn (< 70 tỷ) được định tuyến lập BCKTKT (Thiết kế 1 bước)'
  );

  const costRiskRed = evaluateCostOverrunRisk206(950_000_000_000, 900_000_000_000, 30_000_000_000, 35_000_000_000, 50_000_000_000);
  assert(
    costRiskRed.riskLevel === 'RED_HARD_BLOCK' && costRiskRed.projectedTotalVnd === 965_000_000_000,
    'NĐ 206/2026: Cảnh báo Đỏ (RED_HARD_BLOCK) khi Tổng chi phí dự kiến (965 tỷ) vượt Tổng mức đầu tư (950 tỷ)'
  );

  const ipcCalc = calculateIpcNetPayment210(100_000_000_000, 20, 5, 1_000_000_000, 1.05);
  assert(
    ipcCalc.adjustedGrossAmount === 105_000_000_000 && ipcCalc.netPayableAmount === 77_750_000_000,
    'NĐ 210/2026: Tính toán IPC chuẩn xác (100 tỷ * Pn 1.05 = 105 tỷ, trừ tạm ứng 21 tỷ, bảo hành 5.25 tỷ, phạt 1 tỷ -> Net = 77.75 tỷ)'
  );

  const capCheckFail = validateContractorAndCchn212('CẤP I', 'HẠNG II', '2030-12-31', 'HẠNG I', '2030-12-31');
  assert(
    capCheckFail.isQualified === false && capCheckFail.violationReason.includes('CHẶN KÝ HỢP ĐỒNG'),
    'NĐ 212/2026: Chặn ký hợp đồng khi Nhà thầu Hạng II tham gia thi công công trình Cấp I'
  );

  const nationalSchema = PmsService.exportNationalDatabaseSchema212();
  assert(
    nationalSchema.schemaVersion === 'MOC-NATIONAL-DB-2026-V2' && Array.isArray(nationalSchema.projectsPayload),
    'NĐ 212/2026 & TT 39/2026: Xuất thành công Schema CSDL Quốc gia 6 phân hệ MOC-NATIONAL-DB-2026-V2'
  );

  // --- TEST CASE 17: Interactive Workflow Step-by-Step Blocker, Master Templates & Audit Trail ---
  console.log('\n--- TEST 17: Interactive Workflow Step-by-Step Blocker, Master Templates & Audit Trail ---');
  const lockWithEmptySubmissions = evaluateSequentialWorkflowLock(MASTER_WORKFLOW_TEMPLATES_2026, []);
  assert(
    lockWithEmptySubmissions[0].isUnlocked === true && lockWithEmptySubmissions[1].isUnlocked === false,
    'Workflow Blocker Engine: Bước 1.1 mở khóa mặc định, Bước 1.2 (Mẫu số 04) bị KHÓA CỨNG khi Bước 1.1 chưa hoàn thành'
  );

  const fileVerifyFailNoSig = verifyElectronicCertifiedFile('Mau04_ThamDinh.pdf', ['.pdf', '.docx'], false, true, true, true);
  assert(
    fileVerifyFailNoSig.isValid === false && fileVerifyFailNoSig.message.includes('CHẶN UPLOAD'),
    'Chốt chặn Ký số & Chứng thực: Từ chối file upload nếu thiếu Chữ ký số điện tử SmartCA'
  );

  const nonAdminUpdateAttempt = PmsService.updateMasterTemplateByAdmin(
    'TPL-GDA1-02',
    'v3.0',
    'NĐ 217/2026',
    'Mô tả mới',
    'hieuvv@company.com',
    'Vũ Văn Hiếu',
    'PROJECT_MANAGER'
  );
  assert(
    nonAdminUpdateAttempt.success === false && nonAdminUpdateAttempt.message.includes('CHẶN PHÂN QUYỀN'),
    'RBAC Master Templates: Chặn người dùng thường (PROJECT_MANAGER) cập nhật hoặc thay thế Kho biểu mẫu gốc'
  );

  const adminUpdateAttempt = PmsService.updateMasterTemplateByAdmin(
    'TPL-GDA1-02',
    'v2.2 (2026)',
    'Nghị định 217/2026/NĐ-CP (Mẫu số 04)',
    'Cập nhật biểu mẫu thẩm định mới',
    'admin@pms2026.gov.vn',
    'Quản Trị Viên',
    'ADMIN'
  );
  assert(
    adminUpdateAttempt.success === true && adminUpdateAttempt.updatedTemplate?.version === 'v2.2 (2026)',
    'RBAC Master Templates & Audit Trail: Cho phép ADMIN cập nhật phiên bản biểu mẫu gốc lên v2.2 (2026) và tự động lưu vết Audit Trail'
  );

  // --- TEST CASE 18: Enterprise SaaS UI/UX Currency Input Mask & Status Text Formatting ---
  console.log('\n--- TEST 18: Enterprise SaaS UI/UX Currency Input Mask & Status Text Formatting ---');
  assert(
    formatCurrencyInputMask(35000000000) === '35.000.000.000' && parseCurrencyInputMask('35.000.000.000') === 35000000000,
    'Currency Input Mask: Tự động phân tách hàng nghìn bằng dấu chấm (35.000.000.000) và giải mã chính xác số nguyên 35000000000'
  );
  assert(
    formatStatusOrCodeVN('ĐƠN_GIÁ_ĐIỀU_CHỈNH') === 'Đơn giá điều chỉnh' &&
    formatStatusOrCodeVN('CAP_IV') === 'Cấp IV' &&
    formatStatusOrCodeVN('ĐANG_THỰC_HIỆN') === 'Đang thực hiện',
    'Status & Classification Formatter: Chuẩn hóa các chuỗi có dấu gạch dưới (ĐƠN_GIÁ_ĐIỀU_CHỈNH, CAP_IV, ĐANG_THỰC_HIỆN) sang tiếng Việt chuẩn'
  );

  // --- TEST CASE 19: PHẦN 1 - Kiểm thử Lưu trữ Dữ liệu, Đa định dạng (<=100MB), Toàn vẹn SHA-256 & File Versioning ---
  console.log('\n--- TEST 19: Storage & Integrity Testing (Multi-Format 100MB Quota, SHA-256 Tamper Detection, Versioning & Audit Trail) ---');
  const concurrentBatch = validateConcurrentMultiFormatUpload(
    [
      { fileName: 'ToTrinh_ThamDinh_BCNCKT_ND217.pdf', fileSizeMB: 45.2, stageFolder: 'Giai_Doan_1_Chuan_Bi_Dau_Tu' },
      { fileName: 'BanVe_ThiCong_CauGiaoThoa.dwg', fileSizeMB: 88.5, stageFolder: 'Giai_Doan_2_Thiet_Ke_Du_Toan' },
      { fileName: 'MoHinh_BIM_CauChinh_LOD400.ifc', fileSizeMB: 99.8, stageFolder: 'Giai_Doan_2_Thiet_Ke_Du_Toan' },
      { fileName: 'DuToan_BOQ_ChiTiet_ND206.xlsx', fileSizeMB: 18.4, stageFolder: 'Giai_Doan_2_Thiet_Ke_Du_Toan' },
      { fileName: 'HopDong_ThiCong_QD1040.docx', fileSizeMB: 12.0, stageFolder: 'Giai_Doan_3_Dau_Thau_Hop_Dong' },
      { fileName: 'HoSo_HoanCong_NhatKy_ELogbook.zip', fileSizeMB: 100.0, stageFolder: 'Giai_Doan_4_Thi_Cong_Nghiem_Thu' },
      { fileName: 'MoHinh_BIM_QuaNang_VuotNguong.rvt', fileSizeMB: 100.5, stageFolder: 'Giai_Doan_2_Thiet_Ke_Du_Toan' }
    ],
    'DA-2026-001'
  );
  assert(
    concurrentBatch.acceptedCount === 6 &&
      concurrentBatch.rejectedCount === 1 &&
      concurrentBatch.results[2].accepted === true &&
      concurrentBatch.results[5].accepted === true &&
      concurrentBatch.results[6].accepted === false &&
      concurrentBatch.results[6].status === 'BLOCKED_SIZE_EXCEEDED_100MB',
    'Multi-Format & 100MB Boundary: Chấp nhận đồng thời 6 tệp (.pdf, .dwg, .ifc, .xlsx, .docx, .zip) sát ngưỡng 99.8MB & 100.0MB; Chặn cứng tệp 100.5MB vượt ngưỡng 100MB/tệp'
  );

  // Kiểm thử tính toàn vẹn SHA-256 & Phát hiện giả mạo (Tamper Detection) trên Storage Server
  const origFileHash = computeDeterministicSha256('QuyetDinh_PheDuyet_TMDT_Signed.pdf', 15.6, 'SIGNED_PAYLOAD_ORIGINAL_V1');
  const intactCheck = verifyStoredFileIntegrity(
    {
      fileName: 'QuyetDinh_PheDuyet_TMDT_Signed.pdf',
      fileSizeMB: 15.6,
      sha256Hash: origFileHash,
      digitalSignatureVerified: true
    },
    {
      fileName: 'QuyetDinh_PheDuyet_TMDT_Signed.pdf',
      fileSizeMB: 15.6,
      contentSignature: 'SIGNED_PAYLOAD_ORIGINAL_V1'
    }
  );
  const tamperedCheck = verifyStoredFileIntegrity(
    {
      fileName: 'QuyetDinh_PheDuyet_TMDT_Signed.pdf',
      fileSizeMB: 15.6,
      sha256Hash: origFileHash,
      digitalSignatureVerified: true
    },
    {
      fileName: 'QuyetDinh_PheDuyet_TMDT_Signed.pdf',
      fileSizeMB: 15.6,
      contentSignature: 'HACKED_MODIFIED_BYTE_ON_STORAGE_SERVER'
    }
  );
  assert(
    intactCheck.isIntact === true &&
      intactCheck.status === 'INTEGRITY_VERIFIED' &&
      tamperedCheck.isIntact === false &&
      tamperedCheck.status === 'TAMPERED_HASH_MISMATCH' &&
      tamperedCheck.legalValidity === 'VOID_TAMPERED_ALERT',
    'SHA-256 Checksum & E-Sign Integrity: Phát hiện chính xác hành vi can thiệp/sửa đổi nội dung file trên Storage Server (TAMPERED_HASH_MISMATCH) và thu hồi hiệu lực pháp lý'
  );

  // Kiểm thử Quản lý phiên bản (File Versioning v1.0 -> v1.1) & Audit Trail
  const reuploadV1_1 = PmsService.submitWorkflowStepFile(
    'DA-2026-001',
    'TPL-GDA1-01',
    'BM01_ThuThapDuLieu_DA_CauNhatLe3_Rev2_Signed.xlsx',
    2.6,
    true,
    true,
    'VNPT-SMARTCA-2026-REV2',
    'hieuvv@company.com',
    'Vũ Văn Hiếu (PM)',
    'PROJECT_MANAGER'
  );
  const delAudit = PmsService.deleteWorkflowSubmissionWithAudit(
    'DA-2026-001',
    'TPL-GDA2-01',
    'kethoath@company.com',
    'Phạm Thu Hà',
    'MEMBER',
    'Kiểm thử lưu vết xóa tệp hồ sơ'
  );
  assert(
    reuploadV1_1.success === true &&
      reuploadV1_1.submission?.fileVersion === 'v1.1' &&
      (reuploadV1_1.submission?.versionHistory?.length || 0) === 2 &&
      reuploadV1_1.submission?.versionHistory?.[0].versionTag === 'v1.0' &&
      reuploadV1_1.submission?.versionHistory?.[1].versionTag === 'v1.1' &&
      delAudit.auditLog.actionType === 'DELETE_SUBMISSION_FILE' &&
      Boolean(delAudit.auditLog.actorEmail) &&
      Boolean(delAudit.auditLog.timestamp),
    'File Versioning (v1.0 -> v1.1) & Audit Trail: Tự động tạo phiên bản v1.1 khi ghi đè, bảo toàn phiên bản cũ v1.0 trong lịch sử và ghi nhận đầy đủ Audit Log (Tải xuống, Upload, Ghi đè, Xóa)'
  );

  // --- TEST CASE 20: PHẦN 2 - Sao lưu Tự động 3 Cấp độ (AES-256-GCM) & Phục hồi Thảm họa (DR Scenarios 1 & 2) ---
  console.log('\n--- TEST 20: 3-Tier Automated Backup (AES-256-GCM Offsite) & Disaster Recovery Simulation ---');
  const fullBkp = PmsService.createBackupSnapshot('FULL_WEEKLY', 'admin@pms2026.gov.vn', 'ADMIN', 120);
  const diffBkp = PmsService.createBackupSnapshot('DIFFERENTIAL_DAILY', 'admin@pms2026.gov.vn', 'ADMIN', 120);
  const pitrBkp = PmsService.createBackupSnapshot('PITR_WAL_REALTIME', 'admin@pms2026.gov.vn', 'ADMIN', 120);
  const unauthorizedRestore = PmsService.restoreFromBackupSnapshot(
    fullBkp.snapshot!.snapshotId,
    'stranger@otherdomain.com',
    'VIEWER'
  );
  assert(
    fullBkp.success &&
      diffBkp.success &&
      pitrBkp.success &&
      fullBkp.snapshot?.encryptionAlgorithm === 'AES-256-GCM' &&
      fullBkp.snapshot?.offsiteBucketUri.startsWith('gs://pms-2026-dr-offsite-vault-asia-southeast1/') &&
      unauthorizedRestore.success === false,
    '3-Tier Backup & Security: Khởi tạo đủ 3 cấp độ (Full Weekly, Differential Daily, PITR Real-time), mã hóa AES-256-GCM trên Offsite Cloud Bucket và chặn RBAC truy cập trái phép'
  );

  const drScenario1 = PmsService.runDisasterRecoveryScenario1AccidentalDeletion('DA-2026-001');
  assert(
    drScenario1.deletedSuccessfullySimulated === true &&
      drScenario1.restoreSuccess === true &&
      drScenario1.restoredAttachmentsCount === 120 &&
      drScenario1.hashMatchRatePct === 100 &&
      drScenario1.dataLossPct === 0 &&
      drScenario1.rpoMinutes === 0,
    `DR Kịch bản 1 (Xóa nhầm Dự án DA-2026-001 & 120 file đính kèm): Khôi phục 100% dữ liệu & chữ ký số (Mất mát: ${drScenario1.dataLossPct}%, RPO: ${drScenario1.rpoMinutes} phút, RTO: ${drScenario1.rtoSeconds}s)`
  );

  const drScenario2 = PmsService.runDisasterRecoveryScenario2ServerCrash50Users('DA-2026-001');
  assert(
    drScenario2.concurrentUsersCount === 50 &&
      drScenario2.corruptedRecordsCount === 0 &&
      drScenario2.acidRollbackClean === true &&
      drScenario2.walReplayedTxCount === 38 &&
      drScenario2.finalCompletedUserOps === 50 &&
      drScenario2.databaseIntegrityStatus === 'ZERO_CORRUPTION_ACID_VERIFIED' &&
      drScenario2.actualRpoMinutes === 0,
    `DR Kịch bản 2 (Ngắt đột ngột máy chủ CSDL dưới tải 50 người dùng đồng thời): 0 bản ghi hỏng (ZERO_CORRUPTION), Replay 38 WAL Tx, Rollback sạch 12 Tx dở dang & hoàn tất 50/50 tác vụ (RTO: ${drScenario2.actualRtoSeconds}s, RPO: ${drScenario2.actualRpoMinutes} phút)`
  );

  // --- TEST CASE 21: PHẦN 3 - Xuất Đóng gói Bàn giao & Tất toán (One-click Handover ZIP Archive) ---
  console.log('\n--- TEST 21: One-click Handover ZIP Archive (UTF-8 Vietnamese & Relative Link Integrity) ---');
  const handoverZip = generateZipArchiveStructure('DA-2026-001');
  assert(
    handoverZip.archiveName === 'PMS_2026_DA-2026-001_DIGITAL_HANDOVER_ARCHIVE.ZIP' &&
      handoverZip.totalFilesCount === 148 &&
      handoverZip.utf8VietnameseVerified === true &&
      handoverZip.relativeLinksVerified === true &&
      handoverZip.brokenLinksCount === 0 &&
      handoverZip.manifestEntries.length === 6,
    `One-Click Handover ZIP Archive: Đóng gói 148 tệp từ GĐ 1 đến GĐ 5 (${handoverZip.uncompressedSizeMB}MB -> ${handoverZip.totalSizeMB}MB, tốc độ ${handoverZip.throughputMBps} MB/s), bảo toàn 100% tên file tiếng Việt UTF-8 NFC & liên kết MANIFEST_INDEX.json`
  );

  console.log(`\n================ SUMMARY: ${passed} PASSED, ${failed} FAILED ================`);
  if (failed > 0) {
    process.exit(1);
  }
}

// Chạy test nếu gọi bằng Node/tsx
runPmsUnitTestSuite();
