import React from 'react';
import { ProjectData } from '../pms/T2_Services';
import { FolderGit2, Package, Key, Lock, HardDrive } from 'lucide-react';

interface StageHeaderProps {
  currentStage: number; // 1 | 2 | 3 | 4 | 5
  onStageChange: (stageNum: number) => void;
  projects: ProjectData[];
  selectedProjectId: string;
  onProjectChange: (projId: string) => void;
  selectedPackageId: string;
  onPackageChange: (pkgId: string) => void;
  onOpenPermissionModal?: () => void;
  currentUserEmail?: string;
  currentUserRole?: string;
}

export const STAGE_TITLES: Record<number, string> = {
  1: "CHUẨN BỊ ĐẦU TƯ & KHỞI TẠO DỰ ÁN (STAGE 1 INITIATION)",
  2: "THIẾT KẾ, LẬP KẾ HOẠCH & DỰ TOÁN (STAGE 2 PLANNING & COSTING)",
  3: "ĐẤU THẦU, GPMB & KÝ HỢP ĐỒNG (STAGE 3 PROCUREMENT & CONTRACT)",
  4: "THI CÔNG, GIÁM SÁT & THANH TOÁN (STAGE 4 EXECUTION)",
  5: "BÀN GIAO, QUYẾT TOÁN & BẢO TRÌ (STAGE 5 CLOSURE & MAINTENANCE)"
};

export const StageHeader: React.FC<StageHeaderProps> = ({
  currentStage,
  onStageChange,
  projects,
  selectedProjectId,
  onProjectChange,
  selectedPackageId,
  onPackageChange,
  onOpenPermissionModal,
  currentUserEmail,
  currentUserRole
}) => {
  const currentProject = projects.find(p => p.PROJECT_ID === selectedProjectId);

  const availablePackages = currentProject?.KHLCNT_ITEMS_GDA3 || [
    { packageId: 'GT-TV-01', packageName: 'Gói thầu TV-01: Tư vấn Khảo sát địa chất & Thiết kế BVTC' },
    { packageId: 'GT-XL-01', packageName: 'Gói thầu XL-01: Thi công Xây lắp Cầu & Đường dẫn' },
    { packageId: 'GT-TB-01', packageName: 'Gói thầu TB-01: Cung cấp & Lắp đặt Thiết bị cẩu dầm' }
  ];

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm mb-6">
      {/* ================= HÀNG 1: GIAI ĐOẠN & TIÊU ĐỀ CÙNG 1 DÒNG (DUY NHẤT TRÊN APP) ================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Tiêu đề Stage + Stepper Navigation */}
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-blue-600 text-white font-bold text-xs rounded-full uppercase tracking-wider shadow-sm shrink-0">
            Stage {currentStage}
          </span>
          <h1 className="text-base md:text-lg font-extrabold text-slate-800 uppercase tracking-tight">
            {STAGE_TITLES[currentStage] || 'QUẢN LÝ DỰ ÁN XÂY DỰNG'}
          </h1>
        </div>

        {/* Thanh chuyển bước Giai đoạn */}
        <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200 overflow-x-auto shrink-0">
          {[1, 2, 3, 4, 5].map((num) => (
            <button
              key={num}
              onClick={() => onStageChange(num)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                currentStage === num
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              GĐ {num}
            </button>
          ))}
        </div>
      </div>

      {/* ================= HÀNG 2: BĂNG BỘ LỌC BÊN DƯỚI ================= */}
      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 flex-1">
          {/* Select Dự Án */}
          <div className="flex items-center gap-2 min-w-[280px] flex-1 sm:flex-initial">
            <FolderGit2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Dự án:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => onProjectChange(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm cursor-pointer"
            >
              <option value="ALL_PROJECTS">📦 [ Tất cả Dự án Được Phân Quyền ]</option>
              {projects.map(p => (
                <option key={p.PROJECT_ID} value={p.PROJECT_ID}>
                  {p.PROJECT_ID} - {p.TEN_DU_AN}
                </option>
              ))}
            </select>
          </div>

          {/* Select Gói Thầu (Chỉ hiện khi Giai đoạn 4 hoặc Giai đoạn 5) */}
          {(currentStage === 4 || currentStage === 5) && (
            <div className="flex items-center gap-2 min-w-[280px] flex-1 sm:flex-initial">
              <Package className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Gói thầu:</span>
              <select
                value={selectedPackageId}
                onChange={(e) => onPackageChange(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm cursor-pointer"
              >
                <option value="ALL">📦 [ Tất cả Gói thầu Dự án ]</option>
                {availablePackages.map(pkg => (
                  <option key={pkg.packageId} value={pkg.packageId}>
                    [{pkg.packageId}] {pkg.packageName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Nút Phân quyền & Google Drive sharing */}
        {currentProject && onOpenPermissionModal && (
          <button
            onClick={onOpenPermissionModal}
            className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-lg transition-all shadow-2xs flex items-center gap-1.5 shrink-0"
            title="Quản lý Phân quyền Row-Level Security & Chia sẻ Google Drive"
          >
            <Key className="w-3.5 h-3.5 text-blue-600" />
            <span>🔑 Phân quyền Dự án</span>
          </button>
        )}
      </div>
    </div>
  );
};
