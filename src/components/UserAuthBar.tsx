import React, { useState } from 'react';
import { UserProfile, AVAILABLE_TEST_USERS } from '../pms/T2_Services';
import { ShieldCheck, HardDrive, User, LogOut, ChevronDown, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface UserAuthBarProps {
  currentUser: UserProfile;
  onUserSwitch: (newUser: UserProfile) => void;
  onLogout?: () => void;
}

export const UserAuthBar: React.FC<UserAuthBarProps> = ({
  currentUser,
  onUserSwitch,
  onLogout
}) => {
  const [isOpenMenu, setIsOpenMenu] = useState(false);

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-900 border-purple-200';
      case 'PROJECT_MANAGER':
        return 'bg-blue-100 text-blue-900 border-blue-200';
      case 'MEMBER':
        return 'bg-emerald-100 text-emerald-900 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'SYSTEM ADMIN (Xem Tất Cả)';
      case 'PROJECT_MANAGER':
        return 'PROJECT MANAGER (Owner)';
      case 'MEMBER':
        return 'MEMBER (Được Cấp Quyền)';
      default:
        return 'VIEWER (Khách)';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpenMenu(!isOpenMenu)}
        className="flex items-center gap-3 p-2 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:bg-slate-50 transition-all text-left group"
      >
        <div className="relative">
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.name}
            className="w-9 h-9 rounded-full object-cover border-2 border-blue-500/80 shadow-2xs"
          />
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white"></span>
        </div>

        <div className="hidden sm:block min-w-0 pr-1">
          <div className="text-xs font-black text-slate-900 truncate flex items-center gap-1.5">
            <span>{currentUser.name}</span>
            <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md border ${getRoleBadgeStyle(currentUser.role)}`}>
              {currentUser.role}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono truncate">{currentUser.email}</div>
        </div>

        <ChevronDown size={16} className="text-slate-400 group-hover:text-slate-700 transition-colors shrink-0 ml-1" />
      </button>

      {/* DROPDOWN USER SWITCHER */}
      {isOpenMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpenMenu(false)}></div>

          <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-3xl shadow-2xl p-4 z-50 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="border-b border-slate-100 pb-3 space-y-1">
              <div className="text-xs font-black text-slate-900">{currentUser.name}</div>
              <div className="text-[11px] font-mono text-blue-700 font-bold">{currentUser.email}</div>
              <div className="text-[10px] text-slate-500">{currentUser.department}</div>

              <div className="pt-2 flex flex-wrap gap-1.5">
                <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full border ${getRoleBadgeStyle(currentUser.role)}`}>
                  {getRoleLabel(currentUser.role)}
                </span>
                {currentUser.googleDriveConnected && (
                  <span className="px-2.5 py-1 text-[10px] font-extrabold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <HardDrive className="w-3 h-3 text-emerald-600" /> Google Drive Connected
                  </span>
                )}
              </div>
            </div>

            {/* TEST USER SWITCHER FOR DEMO */}
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase font-black tracking-wider text-slate-400 px-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Chuyển Đổi Tài Khoản Test RBAC Real-time:
              </div>

              <div className="space-y-1">
                {AVAILABLE_TEST_USERS.map(user => {
                  const isSelected = user.email === currentUser.email;

                  return (
                    <button
                      key={user.email}
                      onClick={() => {
                        onUserSwitch(user);
                        setIsOpenMenu(false);
                        toast.info(`Đã chuyển đổi sang tài khoản: ${user.name} (${user.role})`);
                      }}
                      className={`w-full p-2 rounded-xl text-left transition-all flex items-center justify-between gap-2 border ${
                        isSelected
                          ? 'bg-blue-50/80 border-blue-300 text-blue-900 font-bold'
                          : 'hover:bg-slate-50 border-transparent text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img src={user.avatarUrl} alt={user.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                        <div className="truncate">
                          <div className="text-xs font-bold truncate leading-snug">{user.name}</div>
                          <div className="text-[10px] font-mono text-slate-500 truncate">{user.email} ({user.role})</div>
                        </div>
                      </div>

                      {isSelected && <Check size={16} className="text-blue-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LOGOUT BUTTON */}
            {onLogout && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    setIsOpenMenu(false);
                    onLogout();
                  }}
                  className="w-full p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-2 border border-rose-200 cursor-pointer shadow-2xs"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>🚪 Đăng Xuất (Clear Session)</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default UserAuthBar;
