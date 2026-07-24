import React, { useState, useEffect, useMemo } from 'react';
import { PmsService, ProjectData, Stage1DocumentRecord } from '../pms/T2_Services';
import { PmsHandlers } from '../pms/T3_Handlers';
import { ProjectGroup, ConstructionGrade, STAGE1_DOCUMENT_TYPES } from '../pms/T0_Config';
import { formatVND, safeNumber, safeString, calculateProjectRouting, getRequiredDocumentMatrix, canCreateProject, canEditProject } from '../pms/T1_Utils';
import { UserProfile } from '../pms/T2_Services';
import Stage1DocumentUploader from '../components/Stage1DocumentUploader';
import {
  FileCheck2,
  Cpu,
  PlusCircle,
  Building2,
  FileText,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Award,
  AlertCircle,
  Layers,
  ChevronRight,
  Sparkles,
  Zap,
  CheckCircle,
  Upload,
  FolderTree,
  FileCode,
  FileSpreadsheet,
  Archive,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

export default function Stage1InitiationView({
  currentUser,
  onProjectCreated
}: {
  currentUser?: UserProfile | null;
  onProjectCreated?: () => void;
}) {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  
  // Initiation inputs
  const [tenDuAn, setTenDuAn] = useState('');
  const [tongMucDauTuInput, setTongMucDauTuInput] = useState<number>(35_000_000_000);
  const [isSpecial, setIsSpecial] = useState(false);
  const [isSimpleRenovation, setIsSimpleRenovation] = useState(false);
  const [isSpecialArea, setIsSpecialArea] = useState(false); // Vùng đặc biệt khó khăn (< 70 tỷ)
  const [chuDauTu, setChuDauTu] = useState('Ban QLDA Đầu tư Xây dựng Công trình Giao thông');
  const [nguonVon, setNguonVon] = useState('Ngân sách Đầu tư công 2026');
  const [smartCaToken, setSmartCaToken] = useState('SMARTCA-AUTH-TOKEN-ADMIN-2026');

  // Step Matrix active step in Stage 1 (1 to 5)
  const [activeStepId, setActiveStepId] = useState<number>(1);

  useEffect(() => {
    const list = PmsService.getProjects();
    setProjects(list);
    if (list.length > 0 && !selectedProjectId) {
      setSelectedProjectId(list[0].PROJECT_ID);
    }
  }, []);

  const currentProject = projects.find(p => p.PROJECT_ID === selectedProjectId);

  // Real-time Auto-routing engine computation with calculateProjectRouting (NĐ 217/2026/NĐ-CP)
  const routing = useMemo(() => {
    return PmsService.autoRouteProjectGroup(tongMucDauTuInput, isSpecial, isSimpleRenovation);
  }, [tongMucDauTuInput, isSpecial, isSimpleRenovation]);

  const projectRoutingResult = useMemo(() => {
    return calculateProjectRouting(tongMucDauTuInput, isSpecialArea);
  }, [tongMucDauTuInput, isSpecialArea]);

  const isBcktkt = useMemo(() => {
    const limit = isSpecialArea ? 70_000_000_000 : 40_000_000_000;
    return tongMucDauTuInput > 0 && tongMucDauTuInput < limit;
  }, [tongMucDauTuInput, isSpecialArea]);

  // Dynamic Required Document Matrix according to routing result
  const requiredMatrix = useMemo(() => {
    return getRequiredDocumentMatrix(projectRoutingResult);
  }, [projectRoutingResult]);

  const uploadedFiles: Stage1DocumentRecord[] = currentProject?.DOCUMENT_MATRIX_GDA1 || currentProject?.DOCUMENT_ITEMS_GDA1 || [];

  const handleInitiateProject = () => {
    if (!safeString(tenDuAn)) {
      toast.error('Vui lòng nhập Tên Dự Án Khởi Tạo');
      return;
    }

    const newProjectPayload: Partial<ProjectData> = {
      TEN_DU_AN: tenDuAn,
      TONG_MUC_DAU_TU_DU_KIEN: safeNumber(tongMucDauTuInput),
      NHOM_DU_AN: routing.group,
      CAP_CONG_TRINH: routing.recommendedGrade,
      LUONG_XU_LY_PHAP_LY: routing.workflowPath,
      CHU_DAU_TU: chuDauTu,
      NGUON_VON: nguonVon,
      BUOC_HIEN_TAI_GDA1: 1,
      GIAI_DOAN_HIEN_TAI: 1,
      TRANG_THAI: 'KHỞI_TẠO_THÀNH_CÔNG',
      KHOI_LUONG_HOAN_THANH_PCT: 0,
      CANH_BAO_RED_FLAG: false
    };

    const res = PmsHandlers.saveProjectApi(newProjectPayload, smartCaToken);
    if (res.success && res.data) {
      toast.success(`Khởi tạo thành công Dự án ${res.data.PROJECT_ID}! Đã kích hoạt ${routing.workflowPath}`);
      setTenDuAn('');
      const updatedList = PmsService.getProjects();
      setProjects(updatedList);
      setSelectedProjectId(res.data.PROJECT_ID);
      if (onProjectCreated) onProjectCreated();
    } else {
      toast.error(`Lỗi khởi tạo: ${res.message}`);
    }
  };

  const refreshProjectData = () => {
    setProjects(PmsService.getProjects());
  };

  const handleProgressStep = (targetStepId: number) => {
    if (!currentProject) {
      toast.error('Vui lòng chọn Dự án');
      return;
    }

    // Call T3 Handler API to validate required attachments before step progression
    const checkRes = PmsHandlers.validateStepProgressionApi(currentProject.PROJECT_ID, activeStepId);
    if (!checkRes.data?.canProgress && targetStepId > activeStepId) {
      toast.error(checkRes.message);
      return;
    }

    const updated: ProjectData = {
      ...currentProject,
      BUOC_HIEN_TAI_GDA1: targetStepId
    };

    PmsService.saveProject(updated);
    setProjects(PmsService.getProjects());
    setActiveStepId(targetStepId);
    toast.success(`Đã hoàn tất nghiệm thu hồ sơ và nghiệm thu chuyển sang Bước ${targetStepId}!`);
  };

  const activeStepConfig = STAGE1_DOCUMENT_TYPES.find(s => s.stepId === activeStepId) || STAGE1_DOCUMENT_TYPES[0];

  return (
    <div className="space-y-6">
      {/* 1. KHỞI TẠO DỰ ÁN MỚI & AUTO-ROUTING ENGINE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Khởi Tạo Dự Án */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <PlusCircle className="w-5 h-5 text-blue-600" />
            KHỞI TẠO HỒ SƠ DỰ ÁN ĐẦU TƯ XÂY DỰNG MỚI
          </h3>

          {!canCreateProject(currentUser) ? (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-950 font-bold text-xs space-y-1">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span className="font-extrabold uppercase">CHẾ ĐỘ XEM VÀ BÁO CÁO (READ-ONLY)</span>
              </div>
              <p className="text-slate-600 font-normal">
                Tài khoản của bạn ({currentUser?.email} - Vai trò: <strong>{currentUser?.role || 'MEMBER'}</strong>) được cấp quyền theo dõi thông tin. Tính năng <strong>[+ Khởi Tạo Dự Án Mới]</strong> chỉ dành cho Quản trị viên (ADMIN) hoặc Trưởng dự án (PROJECT MANAGER).
              </p>
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">TÊN DỰ ÁN ĐẦU TƯ XÂY DỰNG *</label>
                <input
                  type="text"
                  value={tenDuAn}
                  onChange={e => setTenDuAn(e.target.value)}
                  placeholder="VD: Dự án Xây dựng Cầu Vượt Nút Giao Thông..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">TỔNG MỨC ĐẦU TƯ DỰ KIẾN (VND) *</label>
                  <input
                    type="number"
                    value={tongMucDauTuInput}
                    onChange={e => setTongMucDauTuInput(Number(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono font-bold text-blue-900 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[11px] text-slate-500 font-semibold block mt-1">Định dạng: {formatVND(tongMucDauTuInput)}</span>
                </div>

                {/* DYNAMIC READ-ONLY FIELD FOR NĐ 217/2026/NĐ-CP CLASSIFICATION */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">PHÂN CẤP PHÂN LOẠI (NĐ 217/2026/NĐ-CP)</label>
                  <div className={`p-2.5 rounded-xl border font-black text-xs flex items-center justify-between shadow-2xs transition-all ${
                    isBcktkt 
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-950' 
                      : 'bg-amber-50 border-amber-400 text-amber-950'
                  }`}>
                    <div className="flex items-center gap-2">
                      <Sparkles className={`w-4 h-4 ${isBcktkt ? 'text-emerald-600' : 'text-amber-600'}`} />
                      <span>{projectRoutingResult}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                      isBcktkt ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                    }`}>
                      {isBcktkt ? 'Báo cáo KT-KT' : 'BC NCT-KT'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-normal block mt-1">
                    {isBcktkt 
                      ? `✅ Dự toán < ${isSpecialArea ? '70' : '40'} tỷ VNĐ: Tự động phân loại lập BCKTKT (1 bước thu gọn)`
                      : `⚠️ Dự toán >= ${isSpecialArea ? '70' : '40'} tỷ VNĐ: Tự động phân loại lập BCNCTKT / BCNCKT`}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">NGUỒN VỐN ĐẦU TƯ</label>
                  <select
                    value={nguonVon}
                    onChange={e => setNguonVon(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-800 font-medium outline-none"
                  >
                    <option value="Ngân sách Đầu tư công 2026">Ngân sách Đầu tư công 2026</option>
                    <option value="Vốn ODA & Vay ưu đãi nước ngoài">Vốn ODA & Vay ưu đãi nước ngoài</option>
                    <option value="Vốn PPP (Đối tác Công - Tư)">Vốn PPP (Đối tác Công - Tư)</option>
                    <option value="Vốn Hỗn hợp & Khác">Vốn Hỗn hợp & Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">CHỦ ĐẦU TƯ / ĐẠI DIỆN CHỦ ĐẦU TƯ</label>
                  <input
                    type="text"
                    value={chuDauTu}
                    onChange={e => setChuDauTu(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-800 outline-none"
                  />
                </div>
              </div>

              {/* Checkbox đặc thù theo Nghị định 217/2026/NĐ-CP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all">
                  <input
                    type="checkbox"
                    checked={isSpecialArea}
                    onChange={e => setIsSpecialArea(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">Vùng đặc biệt khó khăn (Hạn mức dưới 70 tỷ)</span>
                    <span className="text-[10px] text-slate-500 block">Nâng hạn mức lập BCKTKT lên 70 tỷ VNĐ</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all">
                  <input
                    type="checkbox"
                    checked={isSpecial}
                    onChange={e => setIsSpecial(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block text-xs">Hạ tầng Kỹ thuật Cấp Đặc biệt</span>
                    <span className="text-[10px] text-slate-500 block">Trình duyệt thẩm định Cấp Bộ / Chính phủ</span>
                  </div>
                </label>
              </div>

              {/* SmartCA token field */}
              <div className="pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
                  <ShieldCheck className="w-4 h-4" /> Tích hợp Xác thực Chữ ký số SmartCA
                </div>

                <button
                  onClick={handleInitiateProject}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" /> Khởi Tạo & Ký Phê Duyệt Dự Án
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Auto-Routing Engine Card */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
              <Cpu className="w-4 h-4" /> AUTO-ROUTING ENGINE
            </div>
            <h4 className="text-base font-extrabold text-white leading-snug">
              CƠ CHẾ PHÂN NHÁNH PHÁP LÝ TỰ ĐỘNG
            </h4>
            <p className="text-[11px] text-slate-400">
              Căn cứ Luật Xây dựng 135/2025 & TT 34/2026/TT-BXD
            </p>

            <div className="space-y-2 pt-2 text-xs">
              <div className="bg-slate-800/90 p-3.5 rounded-xl border border-slate-700">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">NHÓM DỰ ÁN & LUỒNG XỬ LÝ</div>
                <div className="text-emerald-400 font-extrabold text-base mt-1">{routing.group}</div>
              </div>

              <div className="bg-slate-800/90 p-3.5 rounded-xl border border-slate-700">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">CẤP CÔNG TRÌNH ĐỀ XUẤT</div>
                <div className="text-blue-400 font-extrabold text-base mt-1">{routing.recommendedGrade}</div>
              </div>

              <div className="bg-slate-800/90 p-3.5 rounded-xl border border-slate-700">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">CƠ QUAN THẨM ĐỊNH / PHÊ DUYỆT</div>
                <div className="text-amber-300 font-bold text-xs mt-1">{routing.legalBasis}</div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-950/80 border border-blue-700/60 rounded-xl text-xs text-blue-200 flex items-start gap-2.5">
            <Zap className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">Yêu cầu lập và thẩm định: {routing.workflowPath}</span>
          </div>
        </div>
      </div>

      {/* 2. MA TRẬN DANH MỤC HỒ SƠ BẮT BUỘC THEO LUỒNG PHÁP LÝ (AUTO-POPULATED CHECKLIST) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-blue-600" />
              MA TRẬN DANH MỤC HỒ SƠ BẮT BUỘC THEO LUỒNG PHÁP LÝ
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tự động khởi tạo danh mục văn bản cần nộp theo phân loại: <strong className="text-blue-700">{projectRoutingResult}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-blue-50 text-blue-800 text-xs font-bold px-3 py-1 rounded-full border border-blue-200">
              {requiredMatrix.length} Tài liệu quy định
            </span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                <th className="p-3.5 min-w-[220px]">Tên Loại Tài Liệu Hồ Sơ</th>
                <th className="p-3.5 min-w-[180px]">Bước Thực Hiện</th>
                <th className="p-3.5 min-w-[130px]">Trạng Thái Nộp</th>
                <th className="p-3.5 min-w-[200px]">Tệp Đính Kèm</th>
                <th className="p-3.5 text-center min-w-[100px]">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {requiredMatrix.map((item, index) => {
                const existingFile = uploadedFiles.find(f => f.docTypeName === item.docType || f.docTypeId === item.docType);
                return (
                  <tr key={index} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-bold text-slate-800">{item.docType}</td>
                    <td className="p-3.5 text-slate-600 font-medium">{item.step}</td>
                    <td className="p-3.5">
                      {existingFile ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Đã tải lên
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 text-[11px] font-bold rounded-full border border-amber-200">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Chưa có file
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      {existingFile ? (
                        <a href={existingFile.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 font-semibold hover:underline flex items-center gap-1.5 truncate max-w-[220px]">
                          <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                          <span className="truncate">{existingFile.fileName}</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 italic font-mono">-- Trống --</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => {
                          const fileInputEl = document.getElementById('stage1-file-input');
                          if (fileInputEl) fileInputEl.click();
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-600 hover:text-white transition-all text-xs font-semibold shadow-2xs"
                      >
                        <Upload className="w-3.5 h-3.5" /> Upload
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. QUY TRÌNH 5 BƯỚC HỒ SƠ PHÁP LÝ (STEP MATRIX) */}
      {currentProject && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                QUY TRÌNH 5 BƯỚC HỒ SƠ PHÁP LÝ - DỰ ÁN [{currentProject.PROJECT_ID}]
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Luồng: <strong className="text-blue-700">{currentProject.LUONG_XU_LY_PHAP_LY}</strong> | Nhóm: <strong className="text-emerald-700">{currentProject.NHOM_DU_AN}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <span>Trạng thái:</span>
              <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-mono">
                ĐANG_Ở_BƯỚC_{currentProject.BUOC_HIEN_TAI_GDA1 || activeStepId}
              </span>
            </div>
          </div>

          {/* Stepper Navigation */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {STAGE1_DOCUMENT_TYPES.map(step => {
              const isCurrent = step.stepId === (currentProject.BUOC_HIEN_TAI_GDA1 || activeStepId);
              const isPast = step.stepId < (currentProject.BUOC_HIEN_TAI_GDA1 || activeStepId);
              return (
                <button
                  key={step.stepId}
                  onClick={() => setActiveStepId(step.stepId)}
                  className={`p-3 rounded-xl border text-left transition-all relative space-y-1 ${
                    isCurrent
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md font-bold'
                      : isPast
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-[10px] uppercase font-mono tracking-wider opacity-80">Bước {step.stepId}</div>
                  <div className="text-xs font-extrabold truncate">{step.stepName}</div>
                  <div className="text-[10px] opacity-75 font-normal truncate">{step.responsibleUnit}</div>
                </button>
              );
            })}
          </div>

          {/* Active Step Details & Document Uploader */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                  Chi Tiết Bước {activeStepConfig.stepId}
                </span>
                <h4 className="text-base font-bold text-slate-900 mt-1">
                  {activeStepConfig.stepName} - Đơn vị chủ trì: {activeStepConfig.responsibleUnit}
                </h4>
              </div>

              {activeStepId < 5 && (
                <button
                  onClick={() => handleProgressStep(activeStepId + 1)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  <span>Hoàn Tất & Nghiệm Thu Bước {activeStepId + 1}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Document Uploader Tool for active step */}
            <Stage1DocumentUploader
              projectId={currentProject.PROJECT_ID}
              stepId={activeStepId}
              stepConfig={activeStepConfig}
              requiredDocs={activeStepConfig.requiredDocs}
              uploadedDocs={currentProject.DOCUMENT_ITEMS_GDA1 || []}
              onUploadSuccess={refreshProjectData}
            />
          </div>
        </div>
      )}
    </div>
  );
}
