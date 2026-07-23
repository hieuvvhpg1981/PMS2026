import React from 'react';
import { Lock, ShieldAlert, UserX, ArrowLeft, Key, Mail, Building } from 'lucide-react';
import { UserProfile } from '../pms/T2_Services';

interface AccessDeniedGuardProps {
  projectId: string;
  projectName?: string;
  ownerEmail?: string;
  ownerName?: string;
  currentUser: UserProfile;
  onSelectAccessibleProject?: () => void;
}

export const AccessDeniedGuard: React.FC<AccessDeniedGuardProps> = ({
  projectId,
  projectName = 'Dự án Đầu tư Xây dựng',
  ownerEmail = 'admin@pms2026.gov.vn',
  ownerName = 'Trưởng Ban Dự Án',
  currentUser,
  onSelectAccessibleProject
}) => {
  return (
    <div className="min-h-[480px] bg-slate-50 border-2 border-red-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-lg my-6">
      {/* SECURITY LOCK BADGE ICON */}
      <div className="w-20 h-20 rounded-full bg-red-100 border-4 border-red-200 flex items-center justify-center text-red-600 mb-6 shadow-inner animate-pulse">
        <Lock className="w-10 h-10" />
      </div>

      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-red-100 text-red-800 font-extrabold text-xs rounded-full uppercase tracking-wider mb-3">
        <ShieldAlert className="w-4 h-4" /> BẢO MẬT PHÂN QUYỀN DỰ ÁN (ROW-LEVEL SECURITY)
      </div>

      <h2 className="text-xl md:text-2xl font-black text-slate-900 max-w-xl leading-tight">
        🔒 Bạn không có quyền truy cập vào thông tin hồ sơ của dự án này!
      </h2>

      <p className="text-slate-600 text-sm max-w-lg mt-3 font-medium">
        Tài khoản <strong className="text-red-700 font-bold">{currentUser.email}</strong> ({currentUser.role}) không nằm trong danh sách Trưởng dự án (Owner) hoặc Thành viên được phân quyền truy cập dự án <strong className="text-slate-900">[{projectId}]</strong>.
      </p>

      {/* PROJECT OWNER CONTACT INFO */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 mt-6 max-w-md w-full text-left space-y-3 shadow-xs">
        <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 flex items-center gap-2">
          <Key className="w-4 h-4 text-blue-600" /> Thông tin Người Quản trị / Trưởng Dự án
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 font-bold">Mã Dự Án:</span>
          <span className="font-mono font-black text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{projectId}</span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 font-bold">Trưởng Dự Án (Owner):</span>
          <span className="font-bold text-slate-900">{ownerName}</span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 font-bold">Email Phân Quyền:</span>
          <span className="font-mono text-blue-700 font-semibold">{ownerEmail}</span>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        {onSelectAccessibleProject && (
          <button
            onClick={onSelectAccessibleProject}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Quay Lại Dự Án Được Phân Quyền
          </button>
        )}

        <a
          href={`mailto:${ownerEmail}?subject=Yeu%20Cau%20Cap%20Quyen%20PMS%202026%20Du%20An%20${projectId}`}
          className="px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
        >
          <Mail className="w-4 h-4" /> Gửi Yêu Cầu Cấp Quyền Truy Cập
        </a>
      </div>
    </div>
  );
};

export default AccessDeniedGuard;
