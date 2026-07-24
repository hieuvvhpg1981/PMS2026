import React, { useState, useEffect } from 'react';
import { PmsService, ProjectData } from '../pms/T2_Services';
import TabHandoverManager from '../components/stage5/TabHandoverManager';
import TabSettlementEngine from '../components/stage5/TabSettlementEngine';
import TabProjectArchive from '../components/stage5/TabProjectArchive';
import {
  FileCheck,
  Receipt,
  Archive,
  FolderArchive,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';

import { UserProfile } from '../pms/T2_Services';

interface Stage5ClosureViewProps {
  currentUser?: UserProfile | null;
  selectedProjectId?: string;
  selectedPackageId?: string;
}

export default function Stage5ClosureView({
  currentUser,
  selectedProjectId: propProjectId,
  selectedPackageId: propPackageId
}: Stage5ClosureViewProps) {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [internalProjectId, setInternalProjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'HANDOVER' | 'SETTLEMENT' | 'ARCHIVE'>('HANDOVER');

  useEffect(() => {
    const list = PmsService.getProjects();
    setProjects(list);
  }, []);

  const activeProjectId = (propProjectId && propProjectId !== 'ALL_PROJECTS' && propProjectId !== 'ALL')
    ? propProjectId
    : (projects[0]?.PROJECT_ID || '');

  const activePackageId = propPackageId || 'ALL';

  const currentProject = projects.find(p => p.PROJECT_ID === activeProjectId) || projects[0];

  const handleUpdateProject = (updated: ProjectData) => {
    PmsService.saveProject(updated);
    setProjects(PmsService.getProjects());
  };

  return (
    <div className="space-y-6">
      {/* 3 TASK NAVIGATION TABS */}
      <div className="flex flex-wrap border-b border-slate-200 bg-white p-2 rounded-2xl border shadow-xs gap-1">
        <button
          onClick={() => setActiveTab('HANDOVER')}
          className={`flex-1 min-w-[200px] py-3 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'HANDOVER'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>1. NGHIỆM THU & BÀN GIAO CÔNG TRÌNH</span>
        </button>

        <button
          onClick={() => setActiveTab('SETTLEMENT')}
          className={`flex-1 min-w-[200px] py-3 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'SETTLEMENT'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>2. QUYẾT TOÁN VỐN & THANH LÝ HỢP ĐỒNG</span>
        </button>

        <button
          onClick={() => setActiveTab('ARCHIVE')}
          className={`flex-1 min-w-[200px] py-3 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'ARCHIVE'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Archive className="w-4 h-4" />
          <span>3. ĐÓNG DỰ ÁN, LƯU TRỮ SỐ & LỊCH BẢO TRÌ</span>
        </button>
      </div>

      {/* RENDER ACTIVE TAB CONTENT */}
      {currentProject ? (
        <>
          {activeTab === 'HANDOVER' && (
            <TabHandoverManager
              currentProject={currentProject}
              selectedPackageId={activePackageId}
              onUpdateProject={handleUpdateProject}
            />
          )}

          {activeTab === 'SETTLEMENT' && (
            <TabSettlementEngine
              currentProject={currentProject}
              selectedPackageId={activePackageId}
              onUpdateProject={handleUpdateProject}
            />
          )}

          {activeTab === 'ARCHIVE' && (
            <TabProjectArchive
              currentProject={currentProject}
              onUpdateProject={handleUpdateProject}
            />
          )}
        </>
      ) : (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
          Vui lòng chọn Dự án trên thanh bộ lọc Header để quản lý Giai đoạn 5.
        </div>
      )}
    </div>
  );
}
