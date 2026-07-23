import React, { useState } from 'react';
import { ProjectData, PmsService } from '../pms/T2_Services';
import { shareDriveFolderWithUsers } from '../pms/T1_Utils';
import { Key, UserCheck, Mail, ShieldCheck, HardDrive, X, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProjectPermissionModalProps {
  project: ProjectData;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProject: (updated: ProjectData) => void;
}

export const ProjectPermissionModal: React.FC<ProjectPermissionModalProps> = ({
  project,
  isOpen,
  onClose,
  onUpdateProject
}) => {
  if (!isOpen) return null;

  const [ownerEmail, setOwnerEmail] = useState<string>(project.ownerEmail || 'hieuvv@company.com');
  const [ownerName, setOwnerName] = useState<string>(project.ownerName || 'Vũ Văn Hiếu');
  const [assignedEmailsInput, setAssignedEmailsInput] = useState<string>(
    (project.assignedEmails || ['kethoath@company.com', 'ketoan@company.com']).join(', ')
  );
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);

  const handleSavePermissions = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncingDrive(true);

    const emailList = assignedEmailsInput
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0 && e.includes('@'));

    const driveSyncResult = shareDriveFolderWithUsers(project.PROJECT_ID, emailList, 'writer');

    const updatedProject: ProjectData = {
      ...project,
      ownerEmail: ownerEmail.trim().toLowerCase(),
      ownerName: ownerName.trim(),
      assignedEmails: emailList,
      driveFolderId: project.driveFolderId || `DRIVE_FOLDER_${project.PROJECT_ID}`,
      driveWebLink: project.driveWebLink || `https://drive.google.com/drive/folders/PMS_Storage_${project.PROJECT_ID}`
    };

    onUpdateProject(updatedProject);

    setTimeout(() => {
      setIsSyncingDrive(false);
      toast.success(`Đã cập nhật phân quyền Row-Level Security & ${driveSyncResult.message}`);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* MODAL HEADER */}
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
              <Key className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm md:text-base">PHÂN QUYỀN & CHIA SẺ GOOGLE DRIVE DỰ ÁN</h3>
              <p className="text-xs text-slate-400 font-mono">Dự án: {project.PROJECT_ID} - {project.TEN_DU_AN}</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* MODAL BODY */}
        <form onSubmit={handleSavePermissions} className="p-6 space-y-5 text-xs">
          {/* OWNER SECTION */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 font-bold text-blue-900 text-xs border-b border-blue-200/60 pb-2">
              <UserCheck className="w-4 h-4 text-blue-600" /> TRƯỞNG DỰ ÁN (PROJECT OWNER - FULL ACCESS)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Trưởng Dự Án (Owner)</label>
                <input
                  type="email"
                  required
                  value={ownerEmail}
                  onChange={e => setOwnerEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-mono font-bold text-blue-900 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Họ Tên Trưởng Dự Án</label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={e => setOwnerName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-bold text-slate-900 outline-none"
                />
              </div>
            </div>
          </div>

          {/* ASSIGNED EMAILS SECTION */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-emerald-600" /> Danh Sách Email Được Cấp Quyền Truy Cập (Assigned Emails)
              </span>
              <span className="text-[11px] text-slate-400 font-normal">Phân tách bằng dấu phẩy (,)</span>
            </label>

            <textarea
              rows={3}
              value={assignedEmailsInput}
              onChange={e => setAssignedEmailsInput(e.target.value)}
              placeholder="kethoath@company.com, ketoan@company.com, designer@company.com"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white font-mono text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-[11px] text-slate-500">
              💡 Các Email trong danh sách này sẽ xem và thao tác được các Phân hệ BOQ, Đấu thầu, Nhật ký, Giải ngân của Dự án [{project.PROJECT_ID}].
            </p>
          </div>

          {/* GOOGLE DRIVE SYNC NOTICE */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3">
            <HardDrive className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-extrabold text-slate-900">Google Drive Personal Folder Sharing</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Tự động đồng bộ cấp quyền Google Drive API (<code className="font-mono text-emerald-700 bg-emerald-50 px-1 rounded">Permissions.create</code>) trên Thư mục <strong className="text-slate-800">/PMS_Storage_UserProjects/{project.PROJECT_ID}/</strong> cho tất cả Email trên.
              </div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
            >
              Hủy Bỏ
            </button>

            <button
              type="submit"
              disabled={isSyncingDrive}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSyncingDrive ? 'Đang Đồng Bộ Drive...' : 'Lưu Phân Quyền & Đồng Bộ Drive'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectPermissionModal;
