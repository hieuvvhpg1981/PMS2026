import React, { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { GoogleOAuthProvider } from '@react-oauth/google';
import {
  LayoutDashboard,
  FileCheck2,
  Calculator,
  FileSignature,
  HardHat,
  Archive,
  Globe2,
  Menu,
  X,
  ShieldCheck,
  Key,
  Settings
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import PmsDashboardView from './views/PmsDashboardView';
import Stage1InitiationView from './views/Stage1InitiationView';
import Stage2DesignCostView from './views/Stage2DesignCostView';
import Stage3ProcurementView from './views/Stage3ProcurementView';
import Stage4ExecutionView from './views/Stage4ExecutionView';
import Stage5ClosureView from './views/Stage5ClosureView';
import NationalDbSyncView from './views/NationalDbSyncView';
import LoginView from './views/LoginView';
import { StageHeader } from './components/StageHeader';
import ErrorBoundary from './components/ErrorBoundary';
import AdminSettingsDrawer from './components/AdminSettingsDrawer';
import UserAuthBar from './components/UserAuthBar';
import AccessDeniedGuard from './components/AccessDeniedGuard';
import ProjectPermissionModal from './components/ProjectPermissionModal';
import { PmsService, ProjectData, AVAILABLE_TEST_USERS, UserProfile } from './pms/T2_Services';
import { canUserAccessProject, filterProjectsForUser } from './pms/T1_Utils';
import { GOOGLE_CLIENT_ID } from './pms/T0_Config';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SidebarItem = ({
  icon: Icon,
  label,
  sublabel,
  active,
  onClick
}: {
  icon: any;
  label: string;
  sublabel?: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center w-full gap-3 px-3.5 py-3 text-left transition-all rounded-xl",
      active
        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 font-semibold"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    )}
  >
    <Icon size={20} className="shrink-0" />
    <div className="truncate">
      <div className="text-xs font-bold leading-snug truncate">{label}</div>
      {sublabel && <div className={cn("text-[11px] truncate opacity-80 font-normal", active ? "text-blue-100" : "text-slate-400")}>{sublabel}</div>}
    </div>
  </button>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Active Authenticated User & Session state with strict Auth Guard (strictly null if no session)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    if (typeof localStorage === 'undefined') return null;
    const savedSession = localStorage.getItem('PMS_SESSION_USER') || localStorage.getItem('PMS_2026_AUTH_USER_KEY');
    if (!savedSession) return null;
    try {
      const user = JSON.parse(savedSession);
      return (user && user.email) ? user : null;
    } catch {
      return null;
    }
  });
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [isAdminSettingsOpen, setIsAdminSettingsOpen] = useState(false);

  // Global Project & Package filter state
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [globalProjectId, setGlobalProjectId] = useState<string>('ALL_PROJECTS');
  const [globalPackageId, setGlobalPackageId] = useState<string>('ALL');

  useEffect(() => {
    const list = PmsService.getProjects();
    setProjects(list);
    if (list.length > 0 && globalProjectId === 'ALL_PROJECTS') {
      setGlobalProjectId(list[0].PROJECT_ID);
    }
  }, []);

  const refreshProjectsList = () => {
    setProjects(PmsService.getProjects());
  };

  const handleLoginSuccess = (user: UserProfile) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('PMS_SESSION_USER', JSON.stringify(user));
    }
    PmsService.setStoredAuthUser(user);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('PMS_SESSION_USER');
    }
    PmsService.clearStoredAuthUser();
    setCurrentUser(null);
  };

  // ================= AUTH GUARD CHÓT CHẶN BẢO VỆ TOÀN CỤC =================
  if (!currentUser) {
    return (
      <ErrorBoundary>
        <Toaster position="top-right" richColors />
        <LoginView onLoginSuccess={handleLoginSuccess} />
      </ErrorBoundary>
    );
  }

  // Filter projects by current user RBAC permissions & assignedProjectIds
  const accessibleProjects = filterProjectsForUser(projects, currentUser.email, currentUser.role, currentUser.assignedProjectIds);
  const selectedProject = projects.find(p => p.PROJECT_ID === globalProjectId) || projects[0];

  const hasAccessToSelectedProject = globalProjectId === 'ALL_PROJECTS'
    ? true
    : canUserAccessProject(selectedProject, currentUser.email, currentUser.role, currentUser.assignedProjectIds);

  const isStageTab = activeTab.startsWith('stage');
  const currentStageNum = isStageTab ? (parseInt(activeTab.replace('stage', ''), 10) || 1) : 1;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-100/70 text-slate-800 flex font-sans antialiased">
          <Toaster position="top-right" richColors />

          {/* Mobile Sidebar Backdrop */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Sidebar Navigation */}
          <aside
            className={cn(
              "fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 shadow-xl lg:shadow-none flex flex-col justify-between transition-transform duration-300 ease-in-out",
              isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}
          >
            <div className="p-4 space-y-4 overflow-y-auto">
              {/* App Brand Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white font-black flex items-center justify-center text-lg shadow-md shadow-blue-500/30">
                    P
                  </div>
                  <div>
                    <div className="font-black text-slate-900 text-sm tracking-tight leading-none">PMS 2026</div>
                    <div className="text-[11px] text-slate-500 font-semibold mt-1">QUẢN LÝ DỰ ÁN XÂY DỰNG</div>
                  </div>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Navigation Menu Links */}
              <nav className="space-y-1">
                <div className="pt-1 pb-1 text-[10px] uppercase tracking-wider font-extrabold text-slate-400 px-3">
                  Tổng Quan & BI
                </div>

                <SidebarItem
                  icon={LayoutDashboard}
                  label="Executive BI Dashboard"
                  sublabel="S-Curve & Red Flag Alert"
                  active={activeTab === 'dashboard'}
                  onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
                />

                <div className="pt-3 pb-1 text-[10px] uppercase tracking-wider font-extrabold text-slate-400 px-3">
                  5 Giai Đoạn Nghiệp Vụ
                </div>

                <SidebarItem
                  icon={FileCheck2}
                  label="GĐ 1: Khởi Tạo & Định Tuyến"
                  sublabel="Auto-routing Nhóm A/B/C"
                  active={activeTab === 'stage1'}
                  onClick={() => { setActiveTab('stage1'); setIsSidebarOpen(false); }}
                />

                <SidebarItem
                  icon={Calculator}
                  label="GĐ 2: Thiết Kế & Dự Toán"
                  sublabel="Áp định mức & Gantt Baseline"
                  active={activeTab === 'stage2'}
                  onClick={() => { setActiveTab('stage2'); setIsSidebarOpen(false); }}
                />

                <SidebarItem
                  icon={FileSignature}
                  label="GĐ 3: Đấu Thầu & Hợp Đồng"
                  sublabel="Năng lực nhà thầu & HĐ 1040"
                  active={activeTab === 'stage3'}
                  onClick={() => { setActiveTab('stage3'); setIsSidebarOpen(false); }}
                />

                <SidebarItem
                  icon={HardHat}
                  label="GĐ 4: Thi Công & Thanh Toán"
                  sublabel="E-Logbook GPS & Hard Block"
                  active={activeTab === 'stage4'}
                  onClick={() => { setActiveTab('stage4'); setIsSidebarOpen(false); }}
                />

                <SidebarItem
                  icon={Archive}
                  label="GĐ 5: Bàn Giao & Quyết Toán"
                  sublabel="Quyết toán NĐ 193 & Handover ZIP"
                  active={activeTab === 'stage5'}
                  onClick={() => { setActiveTab('stage5'); setIsSidebarOpen(false); }}
                />

                <div className="pt-3 pb-1 text-[10px] uppercase tracking-wider font-extrabold text-slate-400 px-3">
                  Cơ Sở Dữ Liệu Quốc Gia
                </div>

                <SidebarItem
                  icon={Globe2}
                  label="API CSDL Quốc Gia BXD"
                  sublabel="Chuẩn TT 39/2026/TT-BXD"
                  active={activeTab === 'nationalDb'}
                  onClick={() => { setActiveTab('nationalDb'); setIsSidebarOpen(false); }}
                />

                {/* CÀI ĐẶT QUẢN TRỊ ADMIN - ĐẶT PHÍA DƯỚI API CSDL QUỐC GIA (ADMIN GUARD) */}
                {currentUser.role === 'ADMIN' && (
                  <>
                    <div className="pt-3 pb-1 text-[10px] uppercase tracking-wider font-extrabold text-purple-600 px-3 flex items-center gap-1">
                      <Settings size={12} /> Quản Trị Hệ Thống
                    </div>

                    <SidebarItem
                      icon={Settings}
                      label="⚙️ Cài Đặt Hệ Thống & Drive"
                      sublabel="Dành riêng cho ADMIN"
                      active={isAdminSettingsOpen}
                      onClick={() => { setIsAdminSettingsOpen(true); setIsSidebarOpen(false); }}
                    />
                  </>
                )}
              </nav>
            </div>

            {/* Footer User Auth Info */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/50">
              <UserAuthBar currentUser={currentUser} onUserSwitch={setCurrentUser} onLogout={handleLogout} />
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top Header Bar with User Profile Control */}
            <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  <Menu size={22} />
                </button>
                <span className="font-extrabold text-sm md:text-base text-slate-900 truncate">
                  PMS 2026 - QLDA Đầu Tư Xây Dựng (Chuẩn Luật 135/2025/QH15)
                </span>

                {/* ADMIN SETTINGS BUTTON GÓC TRÁI (ADMIN GUARD) */}
                {currentUser.role === 'ADMIN' && (
                  <button
                    onClick={() => setIsAdminSettingsOpen(true)}
                    className="ml-2 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-950 border border-purple-300 font-extrabold text-xs rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    title="Cài đặt Hệ thống & Cấu hình Google Drive (Dành riêng cho ADMIN)"
                  >
                    <Settings className="w-4 h-4 text-purple-700 animate-spin-slow" />
                    <span className="hidden sm:inline">⚙️ Cài đặt Hệ thống</span>
                  </button>
                )}
              </div>

              {/* Desktop User Auth Controls */}
              <div className="hidden lg:flex items-center gap-3">
                <UserAuthBar currentUser={currentUser} onUserSwitch={setCurrentUser} onLogout={handleLogout} />
              </div>
            </header>

            {/* Page Body View Router */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
              {/* UNIFIED STAGE HEADER (ROW 1: TITLE & STEPPER | ROW 2: PROJECT & PACKAGE SELECTS) */}
              {isStageTab && (
                <StageHeader
                  currentStage={currentStageNum}
                  onStageChange={(stageNum) => setActiveTab(`stage${stageNum}`)}
                  projects={accessibleProjects}
                  selectedProjectId={globalProjectId}
                  onProjectChange={setGlobalProjectId}
                  selectedPackageId={globalPackageId}
                  onPackageChange={setGlobalPackageId}
                  onOpenPermissionModal={() => setIsPermissionModalOpen(true)}
                  currentUserEmail={currentUser.email}
                  currentUserRole={currentUser.role}
                />
              )}

              {/* SECURITY GUARDRAIL CHECK FOR STAGE VIEWS */}
              {isStageTab && !hasAccessToSelectedProject ? (
                <AccessDeniedGuard
                  projectId={globalProjectId}
                  projectName={selectedProject?.TEN_DU_AN}
                  ownerEmail={selectedProject?.ownerEmail}
                  ownerName={selectedProject?.ownerName}
                  currentUser={currentUser}
                  onSelectAccessibleProject={() => setGlobalProjectId(accessibleProjects[0]?.PROJECT_ID || 'DA-2026-001')}
                />
              ) : (
                <>
                  {activeTab === 'dashboard' && <PmsDashboardView onSelectProject={() => setActiveTab('stage4')} />}
                  {activeTab === 'stage1' && <Stage1InitiationView onProjectCreated={() => { refreshProjectsList(); setActiveTab('stage2'); }} />}
                  {activeTab === 'stage2' && <Stage2DesignCostView />}
                  {activeTab === 'stage3' && <Stage3ProcurementView />}
                  {activeTab === 'stage4' && <Stage4ExecutionView selectedProjectId={globalProjectId} selectedPackageId={globalPackageId} />}
                  {activeTab === 'stage5' && <Stage5ClosureView selectedProjectId={globalProjectId} selectedPackageId={globalPackageId} />}
                  {activeTab === 'nationalDb' && <NationalDbSyncView />}
                </>
              )}
            </main>

            {/* PROJECT PERMISSION & GOOGLE DRIVE SHARING MODAL */}
            {selectedProject && (
              <ProjectPermissionModal
                project={selectedProject}
                isOpen={isPermissionModalOpen}
                onClose={() => setIsPermissionModalOpen(false)}
                onUpdateProject={(updated) => {
                  PmsService.saveProject(updated);
                  refreshProjectsList();
                }}
              />
            )}

            {/* ADMIN SYSTEM SETTINGS DRAWER MODAL (STRICT ADMIN GUARD) */}
            {currentUser?.role === 'ADMIN' && (
              <AdminSettingsDrawer
                isOpen={isAdminSettingsOpen}
                onClose={() => setIsAdminSettingsOpen(false)}
                currentUser={currentUser}
                onRefreshProjects={refreshProjectsList}
              />
            )}
          </div>
        </div>
    </ErrorBoundary>
  );
}
