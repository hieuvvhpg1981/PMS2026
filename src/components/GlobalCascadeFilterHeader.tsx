import React, { useMemo, useEffect } from 'react';
import { ProjectData } from '../pms/T2_Services';
import { FolderGit2, Package, Filter, ShieldCheck } from 'lucide-react';

interface GlobalCascadeFilterHeaderProps {
  projects: ProjectData[];
  selectedProjectId: string;
  selectedPackageId: string;
  onSelectProject: (projId: string) => void;
  onSelectPackage: (pkgId: string) => void;
  activeTab: string; // 'dashboard' | 'stage1' | 'stage2' | 'stage3' | 'stage4' | 'stage5' | 'nationalDb'
}

export default function GlobalCascadeFilterHeader({
  projects,
  selectedProjectId,
  selectedPackageId,
  onSelectProject,
  onSelectPackage,
  activeTab
}: GlobalCascadeFilterHeaderProps) {
  // Current active project object
  const currentProject = useMemo(() => {
    if (selectedProjectId === 'ALL_PROJECTS') return null;
    return projects.find(p => p.PROJECT_ID === selectedProjectId);
  }, [projects, selectedProjectId]);

  // Packages belonging strictly to selected project (or all packages if ALL_PROJECTS selected)
  const availablePackages = useMemo(() => {
    if (selectedProjectId === 'ALL_PROJECTS') {
      const allPkgs: Array<{ packageId: string; packageName: string }> = [];
      projects.forEach(p => {
        if (p.KHLCNT_ITEMS_GDA3 && p.KHLCNT_ITEMS_GDA3.length > 0) {
          p.KHLCNT_ITEMS_GDA3.forEach(pkg => {
            if (!allPkgs.some(item => item.packageId === pkg.packageId)) {
              allPkgs.push({ packageId: pkg.packageId, packageName: pkg.packageName });
            }
          });
        }
      });
      return allPkgs;
    }
    const proj = projects.find(p => p.PROJECT_ID === selectedProjectId);
    return proj?.KHLCNT_ITEMS_GDA3 || [];
  }, [projects, selectedProjectId]);

  // Auto-reset package selection when project changes to avoid invalid package state
  useEffect(() => {
    onSelectPackage('ALL_PACKAGES');
  }, [selectedProjectId]);

  const currentPackage = availablePackages.find(p => p.packageId === selectedPackageId);

  // STAGE-BASED FILTER VISIBILITY RULE (Quy định nghiệp vụ xây dựng)
  // Stage 1 (Khởi tạo) & Stage 2 (Dự toán): ẨN HOÀN TOÀN Dropdown Gói thầu
  // Stage 3, 4, 5 & BI Dashboard: Hiển thị đầy đủ cả 2 Dropdown
  const showPackageFilter = activeTab !== 'stage1' && activeTab !== 'stage2';

  return (
    <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl border border-slate-800 space-y-3 mb-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        {/* Title & Icon */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center font-bold">
            <Filter className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
              <span>BỘ LỌC ĐỘNG THEO GIAI ĐOẠN NGHIỆP VỤ (STAGE-BASED CASCADE FILTER)</span>
            </div>
            <h3 className="text-sm font-bold text-slate-100">
              {showPackageFilter ? 'QUẢN LÝ TẬP TRUNG THEO DỰ ÁN & GÓI THẦU CON' : 'QUẢN LÝ TẬP TRUNG THEO DỰ ÁN (GĐ CHƯA ĐẤU THẦU)'}
            </h3>
          </div>
        </div>

        {/* 2-Tier Cascade Selectors */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          {/* Dropdown 1: Select Project (Hiển thị ở TẤT CẢ các Giai đoạn) */}
          <div className="flex items-center gap-2 w-full sm:w-auto bg-slate-800/90 p-1.5 px-3 rounded-xl border border-slate-700">
            <FolderGit2 className="w-4 h-4 text-blue-400 shrink-0" />
            <select
              value={selectedProjectId}
              onChange={(e) => onSelectProject(e.target.value)}
              className="bg-transparent text-xs font-bold text-white outline-none w-full sm:w-64 cursor-pointer"
            >
              <option value="ALL_PROJECTS" className="bg-slate-900 text-white">📦 [ TOÀN BỘ DỰ ÁN BAN QLDA ]</option>
              {projects.map(p => (
                <option key={p.PROJECT_ID} value={p.PROJECT_ID} className="bg-slate-900 text-white">
                  [{p.PROJECT_ID}] {p.TEN_DU_AN.substring(0, 32)}...
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown 2: Select Package (CHỈ hiển thị từ Giai đoạn 3, 4, 5 và BI Dashboard) */}
          {showPackageFilter && (
            <>
              {/* Arrow Separator */}
              <span className="text-slate-500 hidden sm:inline text-xs font-bold">➔</span>

              <div className="flex items-center gap-2 w-full sm:w-auto bg-slate-800/90 p-1.5 px-3 rounded-xl border border-slate-700">
                <Package className="w-4 h-4 text-emerald-400 shrink-0" />
                <select
                  value={selectedPackageId}
                  onChange={(e) => onSelectPackage(e.target.value)}
                  disabled={selectedProjectId !== 'ALL_PROJECTS' && availablePackages.length === 0}
                  className="bg-transparent text-xs font-bold text-white outline-none w-full sm:w-64 cursor-pointer disabled:opacity-50"
                >
                  <option value="ALL_PACKAGES" className="bg-slate-900 text-white">📋 [ TẤT CẢ GÓI THẦU CON ]</option>
                  {availablePackages.length > 0 ? (
                    availablePackages.map(pkg => (
                      <option key={pkg.packageId} value={pkg.packageId} className="bg-slate-900 text-white">
                        [{pkg.packageId}] {pkg.packageName.substring(0, 32)}...
                      </option>
                    ))
                  ) : (
                    <option value="ALL_PACKAGES" disabled className="bg-slate-900 text-slate-400">
                      ⚠️ [ Chưa có gói thầu nào ]
                    </option>
                  )}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Context Badge Banner */}
      <div className="bg-slate-800/60 p-2.5 px-4 rounded-xl border border-slate-700/60 flex items-center justify-between text-xs font-medium">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[11px]">📌 Đang xem:</span>
          <span className="font-mono font-bold text-blue-400">
            {selectedProjectId === 'ALL_PROJECTS' ? 'TẤT CẢ DỰ ÁN' : (currentProject?.TEN_DU_AN || selectedProjectId)}
          </span>
          {showPackageFilter ? (
            <>
              <span className="text-slate-500 font-bold">➔</span>
              <span className="font-mono font-bold text-emerald-400">
                {selectedPackageId === 'ALL_PACKAGES' ? 'TẤT CẢ GÓI THẦU' : (currentPackage?.packageName || selectedPackageId)}
              </span>
            </>
          ) : (
            <span className="text-slate-400 text-[11px] font-semibold">
              (Giai đoạn Chuẩn bị đầu tư / Thiết kế dự toán - Chưa có Gói thầu)
            </span>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <span className="bg-blue-900/60 text-blue-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-blue-700">
            SmartCA Sync
          </span>
          <span className="bg-emerald-900/60 text-emerald-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-700">
            {showPackageFilter ? 'Package Mode' : 'Project-Only Mode'}
          </span>
        </div>
      </div>
    </div>
  );
}
