// ============================================================================
// WORKFLOW DEFINITIONS — Types & Default Seed Data
// Dữ liệu mặc định sẽ được seed vào Firestore collection `workflow_definitions`
// Admin có thể thêm/sửa/xóa workflow trực tiếp từ UI mà không cần code.
// ============================================================================

export interface ChecklistItem {
  id: string;
  label: string;
}

export interface InputField {
  id: string;
  label: string;
  type: 'text' | 'date' | 'datetime-local';
  required: boolean;
  placeholder?: string;
}

export interface WorkflowStep {
  stepIndex: number;
  title: string;
  checklist: ChecklistItem[];
  inputFields: InputField[];
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  shortName: string;
  steps: WorkflowStep[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

// Firestore document for task_executions
export interface TaskExecution {
  id: string;
  planDocId?: string;
  planId: string;
  planDescription: string;
  workflowId: string;
  workflowName: string;
  currentStep: number;
  totalSteps: number;
  status: 'in_progress' | 'completed';
  stepsData: {
    [stepIndex: number]: {
      checklist: { [checklistId: string]: boolean };
      inputs: { [inputId: string]: string };
      completedAt?: string;
    };
  };
  metadata: {
    maKHLCNT?: string;
    ngayDangTai?: string;
    maTBMT?: string;
    thoiGianMoThau?: string;
    ngayThongBaoKetQua?: string;
  };
  taskName: string;
  assignee: string;
  estimatedPrice: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  departmentName: string;
  namKeHoach: number;
}

// ============================================================================
// DEFAULT SEED WORKFLOWS
// ============================================================================

export const DEFAULT_WORKFLOWS: WorkflowDefinition[] = [
  // ═══════════════════════════════════════════════════════════════════
  // I. CHỈ ĐỊNH THẦU THÔNG THƯỜNG (6 Bước)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'chi_dinh_thau_tt',
    name: 'Chỉ định thầu thông thường',
    shortName: 'CĐTTT',
    steps: [
      {
        stepIndex: 0,
        title: 'Bước 1: Chuẩn bị lựa chọn nhà thầu',
        checklist: [
          { id: 'cdtt_1_1', label: 'Tờ trình phê duyệt HSYC của Bộ phận chuyên môn/Tư vấn đấu thầu.' },
          { id: 'cdtt_1_2', label: 'Dự thảo HSYC (lập theo mẫu quy định tại Thông tư số 80/2025/TT-BTC).' },
          { id: 'cdtt_1_3', label: 'Bản sao hợp pháp QĐ phê duyệt dự án/dự toán mua sắm và QĐ phê duyệt KHLCNT.' },
          { id: 'cdtt_1_4', label: 'Báo cáo thẩm định HSYC của Tổ thẩm định hoặc đơn vị tư vấn (Khoản 1 Điều 27 và Khoản 4 Điều 16 NĐ 214/2025/NĐ-CP).' },
          { id: 'cdtt_1_5', label: 'Quyết định phê duyệt HSYC do đại diện có thẩm quyền ký ban hành.' },
        ],
        inputFields: [
          { id: 'cdtt_1_maKHLCNT', label: 'Mã KHLCNT', type: 'text', required: true, placeholder: 'Nhập mã KHLCNT' },
        ],
      },
      {
        stepIndex: 1,
        title: 'Bước 2: Tổ chức lựa chọn nhà thầu',
        checklist: [
          { id: 'cdtt_2_1', label: 'Văn bản gửi kèm HSYC chính thức cho nhà thầu được định danh.' },
          { id: 'cdtt_2_2', label: 'Biên bản tiếp nhận Hồ sơ đề xuất (HSĐX) trước thời điểm đóng thầu.' },
          { id: 'cdtt_2_3', label: 'Văn bản/Chứng từ chứng minh tính bảo mật của HSĐX (Khoản 3 Điều 28 NĐ 214/2025/NĐ-CP).' },
        ],
        inputFields: [],
      },
      {
        stepIndex: 2,
        title: 'Bước 3: Đánh giá HSĐX và Thương thảo hợp đồng',
        checklist: [
          { id: 'cdtt_3_1', label: 'QĐ thành lập Tổ chuyên gia (đáp ứng điều kiện năng lực tại Điều 21 NĐ 214/2025/NĐ-CP).' },
          { id: 'cdtt_3_2', label: 'Bản cam kết bảo mật và độc lập, khách quan của từng thành viên Tổ chuyên gia.' },
          { id: 'cdtt_3_3', label: 'Các Phiếu đánh giá cá nhân và Báo cáo đánh giá HSĐX tổng hợp.' },
          { id: 'cdtt_3_4', label: 'Hồ sơ làm rõ (Văn bản yêu cầu làm rõ và Văn bản giải trình kèm tài liệu của nhà thầu).' },
          { id: 'cdtt_3_5', label: 'Văn bản mời thương thảo hợp đồng.' },
          { id: 'cdtt_3_6', label: 'Biên bản thương thảo hợp đồng tuân thủ Điều 45 NĐ 214/2025/NĐ-CP.' },
        ],
        inputFields: [],
      },
      {
        stepIndex: 3,
        title: 'Bước 4: Thẩm định, Phê duyệt và Công khai kết quả',
        checklist: [
          { id: 'cdtt_4_1', label: 'Báo cáo thẩm định kết quả chỉ định thầu của Tổ thẩm định (Khoản 1 Điều 33 và Khoản 4 Điều 136 NĐ 214/2025/NĐ-CP).' },
          { id: 'cdtt_4_2', label: 'Quyết định phê duyệt kết quả chỉ định thầu của Chủ đầu tư (Khoản 3 Điều 33 NĐ 214/2025/NĐ-CP).' },
          { id: 'cdtt_4_3', label: 'Văn bản thông báo kết quả trúng thầu gửi cho nhà thầu.' },
          { id: 'cdtt_4_4', label: 'Ảnh chụp màn hình/Xác nhận đăng tải kết quả thành công trên Hệ thống mạng đấu thầu quốc gia.' },
        ],
        inputFields: [],
      },
      {
        stepIndex: 4,
        title: 'Bước 5: Hoàn thiện, Ký kết và Quản lý hợp đồng',
        checklist: [
          { id: 'cdtt_5_1', label: 'Văn bản Hợp đồng chính thức kèm các Phụ lục hợp đồng.' },
          { id: 'cdtt_5_2', label: 'Thư bảo lãnh thực hiện hợp đồng hoặc chứng từ nộp tiền ký quỹ.' },
        ],
        inputFields: [],
      },
      {
        stepIndex: 5,
        title: 'Bước 6: Nghiệm thu, Thanh toán',
        checklist: [],
        inputFields: [],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // II. CHỈ ĐỊNH THẦU RÚT GỌN (5 Bước)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'chi_dinh_thau_rg',
    name: 'Chỉ định thầu rút gọn',
    shortName: 'CĐTRG',
    steps: [
      {
        stepIndex: 0,
        title: 'Bước 1: Chuẩn bị và Gửi dự thảo hợp đồng',
        checklist: [
          { id: 'cdrg_1_1', label: 'Quyết định phê duyệt KHLCNT của cấp có thẩm quyền.' },
          { id: 'cdrg_1_2', label: 'Bản sao Giấy ĐKKD, hồ sơ năng lực cốt lõi của nhà thầu mục tiêu.' },
          { id: 'cdrg_1_3', label: 'Văn bản gửi kèm Bản dự thảo hợp đồng hoàn chỉnh cho nhà thầu.' },
        ],
        inputFields: [
          { id: 'cdrg_1_maKHLCNT', label: 'Mã KHLCNT', type: 'text', required: true, placeholder: 'Nhập mã KHLCNT' },
        ],
      },
      {
        stepIndex: 1,
        title: 'Bước 2: Thương thảo, Hoàn thiện hợp đồng',
        checklist: [
          { id: 'cdrg_2_1', label: 'Văn bản đề xuất phương án kỹ thuật, biện pháp thực hiện và Bảng chào giá chi tiết của nhà thầu.' },
          { id: 'cdrg_2_2', label: 'Biên bản làm việc/Biên bản thương thảo hoàn thiện hợp đồng.' },
        ],
        inputFields: [],
      },
      {
        stepIndex: 2,
        title: 'Bước 3: Phê duyệt và Công khai kết quả',
        checklist: [
          { id: 'cdrg_3_1', label: 'Tờ trình phê duyệt kết quả chỉ định thầu rút gọn.' },
          { id: 'cdrg_3_2', label: 'Quyết định phê duyệt kết quả của Chủ đầu tư.' },
          { id: 'cdrg_3_3', label: 'Biên lai/Xác nhận hệ thống về việc đăng tải kết quả trên Hệ thống mạng đấu thầu quốc gia.' },
        ],
        inputFields: [
          { id: 'cdrg_3_ngayDangTai', label: 'Ngày đăng tải kết quả', type: 'date', required: true, placeholder: '' },
        ],
      },
      {
        stepIndex: 3,
        title: 'Bước 4: Ký kết và Quản lý thực hiện hợp đồng',
        checklist: [],
        inputFields: [],
      },
      {
        stepIndex: 4,
        title: 'Bước 5: Nghiệm thu, Thanh toán',
        checklist: [],
        inputFields: [],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // III. CHÀO HÀNG CẠNH TRANH QUA MẠNG — E-CHM (6 Bước)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'chao_hang_ct_mang',
    name: 'Chào hàng cạnh tranh qua mạng (E-CHM)',
    shortName: 'E-CHM',
    steps: [
      {
        stepIndex: 0,
        title: 'Bước 1: Chuẩn bị lựa chọn nhà thầu (E-HSMT)',
        checklist: [
          { id: 'echm_1_1', label: 'Lập E-HSMT dựa trên biểu mẫu điện tử Webform trên Hệ thống VNEPS (Thông tư 79/2025/TT-BTC).' },
          { id: 'echm_1_2', label: 'Báo cáo thẩm định E-HSMT của Tổ thẩm định (Điều 27 và Điều 135 NĐ 214/2025/NĐ-CP).' },
          { id: 'echm_1_3', label: 'Quyết định phê duyệt E-HSMT bằng văn bản (Khoản 2 Điều 27 NĐ 214/2025/NĐ-CP).' },
        ],
        inputFields: [
          { id: 'echm_1_maKHLCNT', label: 'Mã KHLCNT', type: 'text', required: true, placeholder: 'Nhập mã KHLCNT' },
        ],
      },
      {
        stepIndex: 1,
        title: 'Bước 2: Tổ chức lựa chọn nhà thầu qua mạng',
        checklist: [
          { id: 'echm_2_1', label: 'Sửa đổi, Làm rõ E-HSMT (Nếu có).' },
        ],
        inputFields: [
          { id: 'echm_2_ngayDangTai', label: 'Ngày đăng tải thông báo', type: 'date', required: true, placeholder: '' },
          { id: 'echm_2_maTBMT', label: 'Mã TBMT', type: 'text', required: true, placeholder: 'Nhập mã TBMT' },
          { id: 'echm_2_thoiGianMoThau', label: 'Thời gian nộp thầu & mở thầu điện tử (E-MoThau)', type: 'datetime-local', required: true, placeholder: '' },
        ],
      },
      {
        stepIndex: 2,
        title: 'Bước 3: Đánh giá E-HSDT và xếp hạng nhà thầu',
        checklist: [
          { id: 'echm_3_1', label: 'Đánh giá tính hợp lệ và Năng lực, Kinh nghiệm.' },
          { id: 'echm_3_2', label: 'Đánh giá về Kỹ thuật.' },
          { id: 'echm_3_3', label: 'Đánh giá về Tài chính và Xếp hạng nhà thầu.' },
        ],
        inputFields: [],
      },
      {
        stepIndex: 3,
        title: 'Bước 4: Thương thảo hợp đồng (nếu có) và phê duyệt kết quả',
        checklist: [
          { id: 'echm_4_1', label: 'Biên bản thương thảo hợp đồng.' },
          { id: 'echm_4_2', label: 'Báo cáo Thẩm định và Quyết định Phê duyệt kết quả lựa chọn nhà thầu (E-KQLCNT).' },
          { id: 'echm_4_3', label: 'Công khai thông tin kết quả lựa chọn nhà thầu.' },
        ],
        inputFields: [
          { id: 'echm_4_ngayTBKQ', label: 'Ngày thông báo kết quả', type: 'date', required: true, placeholder: '' },
        ],
      },
      {
        stepIndex: 4,
        title: 'Bước 5: Hoàn thiện, ký kết và quản lý hợp đồng',
        checklist: [],
        inputFields: [],
      },
      {
        stepIndex: 5,
        title: 'Bước 6: Nghiệm thu, Thanh toán',
        checklist: [],
        inputFields: [],
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // IV. CHÀO GIÁ CẠNH TRANH (3 Báo giá < 50 triệu) — 4 Bước
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'chao_gia_ct',
    name: 'Chào giá cạnh tranh (3 Báo giá < 50 triệu)',
    shortName: 'CGCT',
    steps: [
      {
        stepIndex: 0,
        title: 'Bước 1: Thu thập báo giá và Xác định giá gói thầu',
        checklist: [],
        inputFields: [],
      },
      {
        stepIndex: 1,
        title: 'Bước 2: Lập tờ trình mua sắm thuê dịch vụ',
        checklist: [],
        inputFields: [],
      },
      {
        stepIndex: 2,
        title: 'Bước 3: Phân tích báo giá, Hoàn thiện và Ký kết hợp đồng/Hóa đơn mua sắm',
        checklist: [],
        inputFields: [],
      },
      {
        stepIndex: 3,
        title: 'Bước 4: Nghiệm thu, Thanh toán',
        checklist: [],
        inputFields: [],
      },
    ],
  },
];
