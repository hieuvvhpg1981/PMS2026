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
  1: "Chuẩn bị đầu tư & khởi tạo dự án (Stage 1)",
  2: "Thiết kế, lập kế hoạch & dự toán (Stage 2)",
  3: "Đấu thầu, GPMB & ký hợp đồng (Stage 3)",
  4: "Thi công, giám sát & thanh toán (Stage 4)",
  5: "Bàn giao, quyết toán & bảo trì (Stage 5)"
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
    { packageId: 'GT-TV-01', packageName: 'Gói thầu TV-01: Tư vấn khảo sát địa chất & thiết kế BVTC' },
    { packageId: 'GT-XL-01', packageName: 'Gói thầu XL-01: Thi công xây lắp cầu & đường dẫn' },
    { packageId: 'GT-TB-01', packageName: 'Gói thầu TB-01: Cung cấp & lắp đặt thiết bị cẩu dầm' }
  ];

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs mb-6">
      {/* ================= HÀNG 1: GIAI ĐOẠN & TIÊU ĐỀ CÙNG 1 DÒNG ================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Tiêu đề Stage + Stepper Navigation */}
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold text-xs rounded-full shrink-0">
            Giai đoạn {currentStage}
          </span>
          <h1 className="text-base md:text-lg font-bold text-slate-800 tracking-tight">
            {STAGE_TITLES[currentStage] || 'Quản lý dự án xây dựng'}
          </h1>
        </div>

        {/* Thanh chuyển bước Giai đoạn */}
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 overflow-x-auto shrink-0">
          {[1, 2, 3, 4, 5].map((num) => (
            <button
              key={num}
              onClick={() => onStageChange(num)}
              className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap border-b-2 ${
                currentStage === num
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-600 font-semibold'
                  : 'text-slate-700 border-transparent hover:bg-slate-100'
              }`}
            >
              Giai đoạn {num}
            </button>
          ))}
        </div>
      </div>

      {/* ================= HÀNG 2: BĂNG BỘ LỌC BÊN DƯỚI ================= */}
      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 flex-1">
          {/* Select Dự Án */}
          <div className="flex items-center gap-2 min-w-[280px] flex-1 sm:flex-initial">
            <FolderGit2 className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="text-sm font-medium text-slate-700 whitespace-nowrap">Dự án:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => onProjectChange(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs cursor-pointer tabular-nums"
            >
              <option value="ALL_PROJECTS">📦 [ Tất cả dự án được phân quyền ]</option>
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
              <span className="text-sm font-medium text-slate-700 whitespace-nowrap">Gói thầu:</span>
              <select
                value={selectedPackageId}
                onChange={(e) => onPackageChange(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs cursor-pointer tabular-nums"
              >
                <option value="ALL">📦 [ Tất cả gói thầu dự án ]</option>
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
            className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-lg transition-all shadow-2xs flex items-center gap-1.5 shrink-0"
            title="Quản lý phân quyền Row-Level Security & chia sẻ Google Drive"
          >
            <Key className="w-4 h-4 text-indigo-600" />
            <span>Phân quyền dự án</span>
          </button>
        )}
      </div>
    </div>
  );
};
