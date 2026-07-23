import React, { useState, useEffect } from 'react';
import { PmsService, ProjectData, UserProfile } from '../pms/T2_Services';
import { SystemSettings, DEFAULT_SYSTEM_SETTINGS, UserRole, UserAccount, INITIAL_USERS } from '../pms/T0_Config';
import { verifyGoogleDriveConnection, updateUserAccountInSystem } from '../pms/T1_Utils';
import {
  Settings,
  X,
  HardDrive,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  FolderGit2,
  RefreshCw,
  Key,
  Check,
  Eye,
  EyeOff,
  RotateCcw,
  Lock,
  UserX,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onRefreshProjects?: () => void;
}

export const AdminSettingsDrawer: React.FC<AdminSettingsDrawerProps> = ({
  isOpen,
  onClose,
  currentUser,
  onRefreshProjects
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'STORAGE' | 'USERS'>('STORAGE');

  // Tab 1: Storage Config States
  const [settings, setSettings] = useState<SystemSettings>(PmsService.getSystemSettings());
  const [isVerifyingDrive, setIsVerifyingDrive] = useState(false);
  const [driveConnectionResult, setDriveConnectionResult] = useState<any | null>(null);

  // Tab 2: Users Accounts & RBAC States
  const [accountsList, setAccountsList] = useState<UserAccount[]>(PmsService.getUserAccounts());
  const [projectsList, setProjectsList] = useState<ProjectData[]>(PmsService.getProjects());
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Add User Modal State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('123456');
  const [newUserRole, setNewUserRole] = useState<UserRole>(UserRole.MEMBER);

  // Edit User Modal State
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<UserRole>(UserRole.MEMBER);
  const [editAssignedProjectIds, setEditAssignedProjectIds] = useState<string[]>([]);
  const [editIsActive, setEditIsActive] = useState(true);
  const [showEditPasswordText, setShowEditPasswordText] = useState(false);

  useEffect(() => {
    setSettings(PmsService.getSystemSettings());
    setAccountsList(PmsService.getUserAccounts());
    setProjectsList(PmsService.getProjects());
  }, [isOpen]);

  const refreshAccountsList = () => {
    const fresh = PmsService.getUserAccounts();
    setAccountsList(fresh);
    if (onRefreshProjects) onRefreshProjects();
  };

  // Tab 1 Actions
  const handleTestDriveConnection = () => {
    setIsVerifyingDrive(true);
    setTimeout(() => {
      const res = verifyGoogleDriveConnection(settings.driveRootFolderId);
      setDriveConnectionResult(res);
      setIsVerifyingDrive(false);
      toast.success(res.message);
    }, 600);
  };

  const handleSaveStorageSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...settings,
      lastVerifiedTimestamp: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    PmsService.saveSystemSettings(updated);
    setSettings(updated);
    toast.success('Đã lưu cấu hình vị trí lưu trữ Google Drive thành công!');
  };

  // Password Visibility Toggle for Table Rows
  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // Quick Password Reset Handler
  const handleQuickResetPassword = (acc: UserAccount) => {
    PmsService.resetUserPassword(acc.id, '123456');
    refreshAccountsList();
    toast.success(`Đã reset mật khẩu của tài khoản [${acc.email}] về mặc định: 123456`);
  };

  // Toggle User Active / Delete Handler
  const handleToggleUserActive = (acc: UserAccount) => {
    const updated: UserAccount = {
      ...acc,
      isActive: !acc.isActive,
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    PmsService.saveUserAccount(updated);
    refreshAccountsList();
    toast.info(`Đã ${updated.isActive ? 'kích hoạt lại' : 'tạm khóa'} tài khoản [${acc.email}]`);
  };

  const handleDeleteUserAccount = (acc: UserAccount) => {
    if (confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản [${acc.email}] khỏi hệ thống?`)) {
      PmsService.deleteUserAccount(acc.id);
      refreshAccountsList();
      toast.success(`Đã xóa vĩnh viễn tài khoản [${acc.email}] khỏi cơ sở dữ liệu.`);
    }
  };

  // Create New User Handler
  const handleCreateNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserEmail.includes('@')) {
      toast.error('Vui lòng nhập Địa chỉ Email hợp lệ!');
      return;
    }

    const newAcc: UserAccount = {
      id: `usr-${Date.now().toString().slice(-4)}`,
      email: newUserEmail.trim().toLowerCase(),
      passwordHash: newUserPassword.trim() || '123456',
      fullName: newUserName.trim() || newUserEmail.split('@')[0],
      role: newUserRole,
      assignedProjectIds: newUserRole === UserRole.ADMIN ? ['ALL'] : ['DA-2026-001'],
      isActive: true,
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    PmsService.saveUserAccount(newAcc);
    refreshAccountsList();
    setShowAddUserModal(false);
    setNewUserEmail('');
    setNewUserName('');
    setNewUserPassword('123456');
    toast.success(`Đã tạo tài khoản mới thành công: ${newAcc.fullName} (${newAcc.email})`);
  };

  // Open Edit User Modal
  const handleOpenEditUserModal = (acc: UserAccount) => {
    setEditingAccount(acc);
    setEditEmail(acc.email);
    setEditFullName(acc.fullName);
    setEditPassword(acc.passwordHash);
    setEditRole(acc.role);
    setEditAssignedProjectIds(acc.assignedProjectIds || []);
    setEditIsActive(acc.isActive);
    setShowEditPasswordText(false);
  };

  // Save Edit User Modal
  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    if (!editEmail || !editEmail.includes('@')) {
      toast.error('Vui lòng nhập Email hợp lệ!');
      return;
    }

    const updatedAcc: UserAccount = {
      ...editingAccount,
      email: editEmail.trim().toLowerCase(),
      fullName: editFullName.trim(),
      passwordHash: editPassword.trim(),
      role: editRole,
      assignedProjectIds: editAssignedProjectIds,
      isActive: editIsActive,
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };

    PmsService.saveUserAccount(updatedAcc);
    refreshAccountsList();
    setEditingAccount(null);
    toast.success(`Đã cập nhật thông tin & phân quyền tài khoản [${updatedAcc.email}] thành công!`);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-start">
      {/* DRAWER CONTAINER */}
      <div className="bg-white w-full max-w-4xl h-full shadow-2xl flex flex-col border-r border-slate-200 animate-in slide-in-from-left duration-300">
        {/* DRAWER HEADER */}
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center shadow-md">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-base tracking-tight">⚙️ CÀI ĐẶT HỆ THỐNG & QUẢN TRỊ ADMIN</h2>
              <p className="text-xs text-purple-300 font-mono">Phiên bản PMS 2026 Enterprise | Admin: {currentUser.email}</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* DRAWER TABS NAVIGATION */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('STORAGE')}
            className={`py-3 px-4 font-extrabold text-xs rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'STORAGE'
                ? 'bg-white text-purple-700 border-purple-600 shadow-2xs'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            <HardDrive className="w-4 h-4" /> 1. CẤU HÌNH GOOGLE DRIVE
          </button>

          <button
            onClick={() => setActiveTab('USERS')}
            className={`py-3 px-4 font-extrabold text-xs rounded-t-xl transition-all flex items-center gap-2 border-b-2 ${
              activeTab === 'USERS'
                ? 'bg-white text-purple-700 border-purple-600 shadow-2xs'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" /> 2. QUẢN LÝ NGƯỜI DÙNG & MẬT KHẨU ({accountsList.length})
          </button>
        </div>

        {/* DRAWER BODY CONTENT */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* TAB 1: STORAGE CONFIGURATION */}
          {activeTab === 'STORAGE' && (
            <form onSubmit={handleSaveStorageSettings} className="space-y-6 text-xs max-w-2xl">
              <div className="bg-purple-50/70 border border-purple-200 p-4 rounded-2xl space-y-2">
                <div className="font-extrabold text-purple-900 text-xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-600" /> QUẢN LÝ LƯU TRỮ VỊ TRÍ HỒ SƠ DỰ ÁN
                </div>
                <p className="text-[11px] text-slate-600">
                  Tất cả hồ sơ bản vẽ hoàn công, hợp đồng, biên bản nghiệm thu khi tải lên ở các Giai đoạn 1 ➔ 5 sẽ được tự động đồng bộ đẩy vào Thư mục gốc Google Drive dưới đây.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block font-extrabold text-slate-800 mb-1">
                    Google Drive Root Folder ID (Mã Thư mục gốc)
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.driveRootFolderId}
                    onChange={e => setSettings({ ...settings, driveRootFolderId: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white font-mono font-bold text-blue-900 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">Lấy từ URL thư mục Google Drive: <code className="font-mono bg-slate-100 px-1">drive.google.com/drive/folders/[ID]</code></span>
                </div>

                <div>
                  <label className="block font-extrabold text-slate-800 mb-1">
                    Tên Thư Mục Lưu Trữ Mặc Định Toàn Cục
                  </label>
                  <input
                    type="text"
                    required
                    value={settings.driveBaseFolderName}
                    onChange={e => setSettings({ ...settings, driveBaseFolderName: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white font-bold text-slate-800 outline-none"
                  />
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <input
                    type="checkbox"
                    id="autoDriveShare"
                    checked={settings.enableAutoDriveShare}
                    onChange={e => setSettings({ ...settings, enableAutoDriveShare: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                  />
                  <label htmlFor="autoDriveShare" className="font-bold text-slate-800 cursor-pointer">
                    Tự động đồng bộ gọi Google Drive Permissions API cấp quyền cho Email thành viên khi phân quyền dự án
                  </label>
                </div>
              </div>

              {/* DRIVE API CONNECTION STATUS BOX */}
              {driveConnectionResult && (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl space-y-2">
                  <div className="font-bold text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {driveConnectionResult.message}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[11px] font-medium pt-1">
                    <div>Dung lượng đã sử dụng: <strong className="font-mono text-emerald-800">{driveConnectionResult.quotaUsedMB} MB</strong></div>
                    <div>Tổng dung lượng khả dụng: <strong className="font-mono text-emerald-800">15.0 GB</strong></div>
                  </div>
                </div>
              )}

              {/* STORAGE ACTION BUTTONS */}
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleTestDriveConnection}
                  disabled={isVerifyingDrive}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isVerifyingDrive ? 'animate-spin' : ''}`} />
                  {isVerifyingDrive ? 'Đang Kiểm Tra...' : '🔍 Kiểm Tra Kết Nối Google Drive'}
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" /> 💾 Lưu Cấu Hình Lưu Trữ
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: USER RBAC & PASSWORD MANAGEMENT */}
          {activeTab === 'USERS' && (
            <div className="space-y-4 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div>
                  <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                    <Users className="w-4.5 h-4.5 text-purple-600" /> QUẢN LÝ TÀI KHOẢN NGƯỜI DÙNG & MẬT KHẨU
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Danh sách tài khoản nội bộ cấp sẵn đăng nhập vào hệ thống PMS 2026</p>
                </div>

                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={16} /> [+ Thêm Người Dùng Mới]
                </button>
              </div>

              {/* USER PERMISSIONS & PASSWORDS TABLE */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
                <table className="w-full text-left border-collapse min-w-[850px]">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="p-3 w-12 text-center">STT</th>
                      <th className="p-3">Họ & Tên</th>
                      <th className="p-3">Email Đăng Nhập</th>
                      <th className="p-3">Mật Khẩu</th>
                      <th className="p-3">Vai Trò (Role)</th>
                      <th className="p-3 text-center">Dự Án Được Gán</th>
                      <th className="p-3 text-center">Trạng Thái</th>
                      <th className="p-3 text-center">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium bg-white">
                    {accountsList.map((acc, idx) => {
                      const isPasswordVisible = !!visiblePasswords[acc.id];
                      const isAllProjects = acc.assignedProjectIds?.includes('ALL') || acc.role === UserRole.ADMIN;

                      return (
                        <tr key={acc.id || acc.email} className="hover:bg-purple-50/30 transition-colors">
                          <td className="p-3 font-mono text-center text-slate-400 font-bold">{idx + 1}</td>

                          <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                            {acc.fullName}
                          </td>

                          <td className="p-3 font-mono text-blue-700 font-bold whitespace-nowrap">
                            {acc.email}
                          </td>

                          {/* MẬT KHẨU CỘT CÓ NÚT EYE 👁️ */}
                          <td className="p-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded-md border border-slate-200 min-w-[90px] text-center">
                                {isPasswordVisible ? acc.passwordHash : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(acc.id)}
                                className="p-1 text-slate-400 hover:text-purple-600 rounded-md transition-colors cursor-pointer"
                                title={isPasswordVisible ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu thực tế'}
                              >
                                {isPasswordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                              </button>
                            </div>
                          </td>

                          <td className="p-3 whitespace-nowrap">
                            <span className={`px-2.5 py-1 text-[10px] font-black rounded-full border uppercase ${
                              acc.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-900 border-purple-200' :
                              acc.role === UserRole.PROJECT_MANAGER ? 'bg-blue-100 text-blue-900 border-blue-200' :
                              acc.role === UserRole.MEMBER ? 'bg-emerald-100 text-emerald-900 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {acc.role}
                            </span>
                          </td>

                          <td className="p-3 text-center whitespace-nowrap">
                            <span className="bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-1 rounded-full font-extrabold text-[11px]">
                              {isAllProjects ? 'Tất cả Dự án (ALL)' : `${acc.assignedProjectIds?.length || 0} Dự án`}
                            </span>
                          </td>

                          {/* TRẠNG THÁI ACTIVE BADGE */}
                          <td className="p-3 text-center whitespace-nowrap">
                            {acc.isActive ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Đang hoạt động
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Khóa tài khoản
                              </span>
                            )}
                          </td>

                          {/* ACTION BUTTONS: EDIT, RESET PASS, LOCK/DELETE */}
                          <td className="p-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditUserModal(acc)}
                                className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] rounded-lg transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                                title="Sửa thông tin, mật khẩu & phân quyền dự án"
                              >
                                <Edit2 size={13} /> Sửa
                              </button>

                              <button
                                onClick={() => handleQuickResetPassword(acc)}
                                className="p-1.5 bg-slate-100 hover:bg-amber-100 text-amber-800 border border-slate-200 rounded-lg transition-all font-bold text-xs cursor-pointer"
                                title="Reset mật khẩu về mặc định 123456"
                              >
                                <RotateCcw size={14} />
                              </button>

                              <button
                                onClick={() => handleToggleUserActive(acc)}
                                className={`p-1.5 border rounded-lg transition-all font-bold text-xs cursor-pointer ${
                                  acc.isActive ? 'bg-slate-100 hover:bg-rose-100 text-rose-700 border-slate-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                }`}
                                title={acc.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                              >
                                {acc.isActive ? <Lock size={14} /> : <UserCheck size={14} />}
                              </button>

                              <button
                                onClick={() => handleDeleteUserAccount(acc)}
                                className="p-1.5 bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-500 border border-slate-200 rounded-lg transition-all cursor-pointer"
                                title="Xóa tài khoản khỏi CSDL"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: ADD NEW USER */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-600" /> THÊM TÀI KHOẢN NGƯỜI DÙNG MỚI
              </h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateNewUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Đăng Nhập (*)</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  placeholder="nhanvien@company.com"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white font-mono font-bold text-blue-900 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Họ Và Tên Cán Bộ (*)</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white font-bold outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mật Khẩu Cấp Sẵn (*)</label>
                <input
                  type="text"
                  required
                  value={newUserPassword}
                  onChange={e => setNewUserPassword(e.target.value)}
                  placeholder="123456"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white font-mono font-bold outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Vai Trò (Role System)</label>
                <select
                  value={newUserRole}
                  onChange={e => setNewUserRole(e.target.value as any)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white font-bold outline-none cursor-pointer"
                >
                  <option value="PROJECT_MANAGER">PROJECT MANAGER (Trưởng Dự Án)</option>
                  <option value="MEMBER">MEMBER (Thành Viên Được Gán)</option>
                  <option value="ADMIN">ADMIN (Quản Trị Viên Toàn Hệ Thống)</option>
                  <option value="VIEWER">VIEWER (Chỉ Xem Báo Cáo BI)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Tạo Tài Khoản Mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT USER COMPREHENSIVE MODAL (EditUserModal) */}
      {editingAccount && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2 uppercase">
                <Edit2 className="w-4 h-4 text-purple-600" /> SỬA THÔNG TIN & PHÂN QUYỀN TÀI KHOẢN
              </h3>
              <button onClick={() => setEditingAccount(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-4 text-xs">
              {/* 1. Email Input */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Địa Chỉ Email Đăng Nhập (*)</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white font-mono font-bold text-blue-900 outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* 2. Full Name Input */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Họ & Tên Cán Bộ (*)</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={e => setEditFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white font-bold text-slate-900 outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* 3. Password Input with Eye reveal */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mật Khẩu Cấp Mới / Cập Nhật (*)</label>
                <div className="relative">
                  <input
                    type={showEditPasswordText ? 'text' : 'password'}
                    required
                    value={editPassword}
                    onChange={e => setEditPassword(e.target.value)}
                    className="w-full pl-3.5 pr-10 py-2.5 border border-slate-300 rounded-xl bg-white font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPasswordText(!showEditPasswordText)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-purple-600 cursor-pointer"
                  >
                    {showEditPasswordText ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* 4. Role Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Vai Trò Hệ Thống (Role)</label>
                <select
                  value={editRole}
                  onChange={e => setEditRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white font-bold text-slate-900 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                >
                  <option value="ADMIN">ADMIN (Quản trị toàn bộ hệ thống)</option>
                  <option value="PROJECT_MANAGER">PROJECT MANAGER (Trưởng dự án / Owner)</option>
                  <option value="MEMBER">MEMBER (Thành viên thực thi & báo cáo)</option>
                  <option value="VIEWER">VIEWER (Khách quan sát / Chỉ xem BI)</option>
                </select>
              </div>

              {/* 5. Assigned Projects Multi-select & Special ALL checkbox */}
              <div className="space-y-2 pt-1">
                <label className="block font-bold text-slate-700">Danh Sách Dự Án Được Phép Truy Cập</label>

                <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50">
                  {/* Special Checkbox: ALL Projects */}
                  <label className="flex items-center gap-3 p-2.5 bg-purple-100/70 border border-purple-300 rounded-xl font-black text-purple-950 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editAssignedProjectIds.includes('ALL')}
                      onChange={e => {
                        if (e.target.checked) {
                          setEditAssignedProjectIds(['ALL']);
                        } else {
                          setEditAssignedProjectIds([]);
                        }
                      }}
                      className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                    />
                    <span>[x] Cho phép xem & thao tác TẤT CẢ Dự án (Lãnh đạo / Admin)</span>
                  </label>

                  {/* Individual Project Checkboxes */}
                  {!editAssignedProjectIds.includes('ALL') && (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pt-1">
                      {projectsList.map(proj => {
                        const isChecked = editAssignedProjectIds.includes(proj.PROJECT_ID);

                        return (
                          <label
                            key={proj.PROJECT_ID}
                            className={`flex items-center gap-3 p-2 rounded-xl border transition-all cursor-pointer ${
                              isChecked
                                ? 'bg-white border-purple-400 text-purple-950 font-bold shadow-2xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={e => {
                                if (e.target.checked) {
                                  setEditAssignedProjectIds([...editAssignedProjectIds, proj.PROJECT_ID]);
                                } else {
                                  setEditAssignedProjectIds(editAssignedProjectIds.filter(id => id !== proj.PROJECT_ID));
                                }
                              }}
                              className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                            />
                            <div className="truncate">
                              <span className="font-mono font-bold text-blue-700 mr-1.5">[{proj.PROJECT_ID}]</span>
                              <span>{proj.TEN_DU_AN}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* 6. Active Status Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <div className="font-bold text-slate-800">Trạng Thái Hoạt Động Tài Khoản</div>
                  <div className="text-[11px] text-slate-500 font-medium">Nếu tắt, người dùng sẽ không thể đăng nhập vào ứng dụng</div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={e => setEditIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 size={16} /> 💾 Lưu Cập Nhật Tài Khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettingsDrawer;
