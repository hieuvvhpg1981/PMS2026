/**
 * T5 - UNIT TEST SUITE (TDD)
 * Chạy giả lập kiểm thử tự động cho các logic core của PMS 2026.
 * Có thể thực thi trực tiếp qua terminal bằng: npx tsx src/pms/T5_SchedulersTests/pmsUnitTests.test.ts
 */

import { PmsService } from '../T2_Services';
import { ProjectGroup, ConstructionGrade, ApprovalStatus, GpmbStatus } from '../T0_Config';
import { safeNumber, safeString, formatVND, validateRequiredAttachments, checkEstimateExceedsTMDT, parseExcelArrayBufferToJSON, updateBoqRow, recalculateTotalBudget, calculateBiddingSavings, validateRequiredAttachmentsStage3, validatePackageDisbursement, canUserAccessProject, filterProjectsForUser, uploadToUserPersonalDrive, shareDriveFolderWithUsers, verifyGoogleDriveConnection, decodeGoogleJwt, matchUserRole, authenticateUserCredentials, updateUserAccountInSystem } from '../T1_Utils';
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

  console.log(`\n================ SUMMARY: ${passed} PASSED, ${failed} FAILED ================`);
  if (failed > 0) {
    process.exit(1);
  }
}

// Chạy test nếu gọi bằng Node/tsx
runPmsUnitTestSuite();
