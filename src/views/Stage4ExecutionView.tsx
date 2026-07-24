import React, { useState, useEffect } from 'react';
import { PmsService, ProjectData } from '../pms/T2_Services';
import { PackageType } from '../pms/T0_Config';
import TabContractManager from '../components/stage4/TabContractManager';
import TabPaymentEngine from '../components/stage4/TabPaymentEngine';
import TabScheduleTracker from '../components/stage4/TabScheduleTracker';
import TabDailyLogbook from '../components/stage4/TabDailyLogbook';
import {
  FileText,
  DollarSign,
  Clock,
  HardHat
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { UserProfile } from '../pms/T2_Services';

interface Stage4ExecutionViewProps {
  currentUser?: UserProfile | null;
  selectedProjectId?: string;
  selectedPackageId?: string;
}

export default function Stage4ExecutionView({
  currentUser,
  selectedProjectId: propProjectId,
  selectedPackageId: propPackageId
}: Stage4ExecutionViewProps = {}) {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<Stage4Tab>('CONTRACT');

  useEffect(() => {
    const list = PmsService.getProjects();
    setProjects(list);
    if (list.length > 0 && !selectedProjectId) {
      setSelectedProjectId(list[0].PROJECT_ID);
    }
  }, []);

  const activeProjectId = (propProjectId && propProjectId !== 'ALL_PROJECTS' && propProjectId !== 'ALL')
    ? propProjectId
    : (selectedProjectId || projects[0]?.PROJECT_ID || '');

  const activePackageId = propPackageId || selectedPackageId || 'ALL';

  const currentProject = projects.find(p => p.PROJECT_ID === activeProjectId) || projects[0];

  const refreshProjectData = () => {
    const list = PmsService.getProjects();
    setProjects(list);
  };

  return (
    <div className="space-y-6">
      {/* 4 TASK-BASED TABS NAVIGATION BAR */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-2">
        <button
          onClick={() => setActiveTab('CONTRACT')}
          className={cn(
            "flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs transition-all",
            activeTab === 'CONTRACT'
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
        >
          <FileText className="w-4 h-4" />
          <span>1. Dự Án & Hợp Đồng</span>
        </button>

        <button
          onClick={() => setActiveTab('PAYMENT')}
          className={cn(
            "flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs transition-all",
            activeTab === 'PAYMENT'
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
        >
          <DollarSign className="w-4 h-4" />
          <span>2. Tạm Ứng & Thanh Toán</span>
        </button>

        <button
          onClick={() => setActiveTab('SCHEDULE')}
          className={cn(
            "flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs transition-all",
            activeTab === 'SCHEDULE'
              ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
        >
          <Clock className="w-4 h-4" />
          <span>3. Tiến Độ & Gantt</span>
        </button>

        <button
          onClick={() => setActiveTab('LOGBOOK')}
          className={cn(
            "flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs transition-all",
            activeTab === 'LOGBOOK'
              ? "bg-amber-600 text-white shadow-md shadow-amber-500/20"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
        >
          <HardHat className="w-4 h-4" />
          <span>4. Nhật Ký Thi Công</span>
        </button>
      </div>

      {/* ACTIVE TAB CONTENT RENDERER */}
      {currentProject && (
        <>
          {activeTab === 'CONTRACT' && (
            <TabContractManager
              project={currentProject}
              selectedPackageId={activePackageId}
            />
          )}

          {activeTab === 'PAYMENT' && (
            <TabPaymentEngine
              project={currentProject}
              selectedProjectId={activeProjectId}
              selectedPackageId={activePackageId}
              onRefreshData={refreshProjectData}
            />
          )}

          {activeTab === 'SCHEDULE' && (
            <TabScheduleTracker
              project={currentProject}
              selectedPackageId={activePackageId}
            />
          )}

          {activeTab === 'LOGBOOK' && (
            <TabDailyLogbook
              project={currentProject}
              selectedPackageId={activePackageId}
              onRefreshData={refreshProjectData}
            />
          )}
        </>
      )}
    </div>
  );
}
