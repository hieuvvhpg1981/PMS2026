import React, { useState, useEffect } from 'react';
import {
  PmsService,
  ProjectData,
  UserProfile,
  WorkflowStepSubmissionRecord,
  WorkflowAuditLogRecord
} from '../pms/T2_Services';
import { PmsHandlers } from '../pms/T3_Handlers';
import { MasterWorkflowTemplateConfig } from '../pms/T0_Config';
import { evaluateSequentialWorkflowLock } from '../pms/T1_Utils';
import {
  GitCommitHorizontal,
  Lock,
  Unlock,
  CheckCircle2,
  Download,
  Upload,
  ShieldCheck,
  FileSpreadsheet,
  FileText,
  History,
  AlertTriangle,
  Award,
  Pencil,
  Check,
  X,
  FolderKanban,
  KeyRound
} from 'lucide-react';
import { toast } from 'sonner';

interface WorkflowTemplateManagerViewProps {
  currentUser?: UserProfile | null;
  selectedProjectId?: string;
}

export default function WorkflowTemplateManagerView({
  currentUser,
  selectedProjectId: propProjectId
}: WorkflowTemplateManagerViewProps) {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>(
    propProjectId && propProjectId !== 'ALL_PROJECTS' ? propProjectId : 'DA-2026-001'
  );
  const [activeSubTab, setActiveSubTab] = useState<'WORKFLOW' | 'MASTER_TEMPLATES' | 'AUDIT_TRAIL'>('WORKFLOW');
  const [stageFilter, setStageFilter] = useState<number | 'ALL'>('ALL');

  const [templates, setTemplates] = useState<MasterWorkflowTemplateConfig[]>([]);
  const [submissions, setSubmissions] = useState<WorkflowStepSubmissionRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<WorkflowAuditLogRecord[]>([]);

  // Active Step Upload Modal / Drawer State
  const [uploadingTemplate, setUploadingTemplate] = useState<MasterWorkflowTemplateConfig | null>(null);
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const [uploadFileSizeMB, setUploadFileSizeMB] = useState<number>(3.5);
  const [hasDigitalSignature, setHasDigitalSignature] = useState<boolean>(true);
  const [hasCertifiedCopy, setHasCertifiedCopy] = useState<boolean>(true);
  const [signerCertId, setSignerCertId] = useState<string>('VNPT-SMARTCA-2026-BXD');

  // Admin Edit Master Template State
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [draftVersion, setDraftVersion] = useState<string>('');
  const [draftLegalBasis, setDraftLegalBasis] = useState<string>('');
  const [draftDescription, setDraftDescription] = useState<string>('');

  const isAdmin = currentUser?.role === 'ADMIN';
  const actorEmail = currentUser?.email || 'hieuvv@company.com';
  const actorName = currentUser?.name || 'Vũ Văn Hiếu (PM)';
  const actorRole = currentUser?.role || 'PROJECT_MANAGER';

  const refreshAllWorkflowData = (projId: string = activeProjectId) => {
    const projs = PmsService.getProjects();
    setProjects(projs);
    setTemplates(PmsService.getMasterTemplates());
    setSubmissions(PmsService.getProjectWorkflowSubmissions(projId));
    setAuditLogs(PmsService.getWorkflowAuditLogs(projId));
  };

  useEffect(() => {
    refreshAllWorkflowData(activeProjectId);
  }, [activeProjectId]);

  useEffect(() => {
    if (propProjectId && propProjectId !== 'ALL_PROJECTS') {
      setActiveProjectId(propProjectId);
    }
  }, [propProjectId]);

  const lockStates = evaluateSequentialWorkflowLock(templates, submissions);

  const completedCount = lockStates.filter(s => s.isCompleted).length;
  const totalSteps = templates.length || 10;
  const progressPct = Math.round((completedCount / totalSteps) * 100);

  const handleDownloadMasterTemplate = (tpl: MasterWorkflowTemplateConfig) => {
    const res = PmsHandlers.workflowDownloadTemplateApi({
      projectId: activeProjectId,
      templateId: tpl.templateId,
      actorEmail,
      actorName,
      actorRole
    });

    // Trigger browser file download of the standardized template
    const sampleContent = [
      `===================================================================`,
      `BIỂU MẪU GỐC CHUẨN HÓA HỆ THỐNG PMS 2026 (MASTER TEMPLATE)`,
      `===================================================================`,
      `Mã Biểu mẫu       : ${tpl.formCode} (${tpl.templateId})`,
      `Bước Quy trình    : ${tpl.stepCode} - ${tpl.stageName}`,
      `Tên Biểu mẫu      : ${tpl.templateName}`,
      `Căn cứ Pháp lý    : ${tpl.legalBasis}`,
      `Phiên bản         : ${tpl.version} (Cập nhật bởi: ${tpl.updatedByAdmin})`,
      `Yêu cầu Ký số     : ${tpl.requiresDigitalSignature ? 'Bắt buộc Ký số SmartCA / Token CA' : 'Tùy chọn'}`,
      `Chứng thực điện tử: ${tpl.requiresCertifiedCopy ? 'Bắt buộc Chứng thực bản sao điện tử từ bản chính' : 'Không bắt buộc'}`,
      `Định dạng Upload  : ${tpl.allowedUploadExtensions.join(', ')}`,
      `-------------------------------------------------------------------`,
      `Hướng dẫn: Điền đầy đủ thông tin dự án [${activeProjectId}], thực hiện ký số`,
      `và tải tệp hoàn thiện lên bước [${tpl.stepCode}] để mở khóa bước kế tiếp.`
    ].join('\n');

    const blob = new Blob([sampleContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tpl.formCode.replace(/[^a-zA-Z0-9_-]/g, '_')}_${tpl.version.replace(/\s+/g, '')}.${tpl.templateFileFormat.toLowerCase()}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    toast.success(res.message);
    refreshAllWorkflowData(activeProjectId);
  };

  const handleOpenUploadModal = (tpl: MasterWorkflowTemplateConfig) => {
    const ext = tpl.allowedUploadExtensions[0] || '.pdf';
    const defaultName = `${tpl.formCode.replace(/[^a-zA-Z0-9_-]/g, '_')}_${activeProjectId}_Signed${ext}`;
    setUploadingTemplate(tpl);
    setUploadFileName(defaultName);
    setUploadFileSizeMB(3.8);
    setHasDigitalSignature(true);
    setHasCertifiedCopy(tpl.requiresCertifiedCopy);
    setSignerCertId(`VNPT-SMARTCA-${actorEmail.split('@')[0].toUpperCase()}-2026`);
  };

  const handleConfirmUploadStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadingTemplate) return;

    const res = PmsHandlers.workflowSubmitStepApi({
      projectId: activeProjectId,
      templateId: uploadingTemplate.templateId,
      fileName: uploadFileName,
      fileSizeMB: uploadFileSizeMB,
      hasDigitalSignature,
      hasCertifiedCopy,
      signerCertificateId: signerCertId,
      actorEmail,
      actorName,
      actorRole
    });

    if (res.success) {
      toast.success(res.message);
      setUploadingTemplate(null);
      refreshAllWorkflowData(activeProjectId);
    } else {
      toast.error(res.message);
      refreshAllWorkflowData(activeProjectId);
    }
  };

  const handleStartAdminEdit = (tpl: MasterWorkflowTemplateConfig) => {
    if (!isAdmin) {
      toast.error('CHẶN PHÂN QUYỀN: Chỉ Quản trị viên (ADMIN) mới được phép cập nhật Kho biểu mẫu gốc!');
      return;
    }
    setEditingTemplateId(tpl.templateId);
    setDraftVersion(tpl.version);
    setDraftLegalBasis(tpl.legalBasis);
    setDraftDescription(tpl.description);
  };

  const handleSaveAdminTemplateUpdate = (templateId: string) => {
    const res = PmsHandlers.workflowAdminUpdateTemplateApi({
      templateId,
      newVersion: draftVersion,
      newLegalBasis: draftLegalBasis,
      newDescription: draftDescription,
      actorEmail,
      actorName,
      actorRole
    });

    if (res.success) {
      toast.success(res.message);
      setEditingTemplateId(null);
      refreshAllWorkflowData(activeProjectId);
    } else {
      toast.error(res.message);
    }
  };

  const displayedTemplates = stageFilter === 'ALL'
    ? templates
    : templates.filter(t => t.stageId === stageFilter);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full font-bold border border-blue-200">
            <GitCommitHorizontal className="w-4 h-4" />
            INTERACTIVE WORKFLOW & MASTER TEMPLATES 2026
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            QUẢN LÝ QUY TRÌNH NỐI TIẾP & KHO BIỂU MẪU ĐIỆN TỬ PHÁP LÝ
          </h2>
          <p className="text-xs text-slate-500">
            Cơ chế khóa chặn nối tiếp (Step-by-step Blocker), chuẩn hóa biểu mẫu gốc của Admin, xác thực Chữ ký số / Bản sao điện tử & Lưu vết Audit Trail
          </p>
        </div>

        {/* Project Selector & Progress Pill */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <FolderKanban className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-600">Dự án:</span>
            <select
              value={activeProjectId}
              onChange={e => setActiveProjectId(e.target.value)}
              className="text-xs font-bold text-slate-900 bg-transparent outline-none"
            >
              {projects.map(p => (
                <option key={p.PROJECT_ID} value={p.PROJECT_ID}>
                  [{p.PROJECT_ID}] {p.TEN_DU_AN}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs font-extrabold text-emerald-900">
            Tiến độ Hồ sơ Pháp lý: {completedCount}/{totalSteps} Bước ({progressPct}%)
          </div>
        </div>
      </div>

      {/* 3 Sub-Navigation Tabs */}
      <div className="flex flex-wrap bg-white p-2 rounded-2xl border border-slate-200 shadow-xs gap-1.5">
        <button
          onClick={() => setActiveSubTab('WORKFLOW')}
          className={`flex-1 min-w-[220px] py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'WORKFLOW'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <GitCommitHorizontal className="w-4 h-4" />
          1. LUỒNG QUY TRÌNH NỐI TIẾP & CHỐT CHẶN (BLOCKER)
        </button>

        <button
          onClick={() => setActiveSubTab('MASTER_TEMPLATES')}
          className={`flex-1 min-w-[220px] py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'MASTER_TEMPLATES'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Award className="w-4 h-4" />
          2. KHO BIỂU MẪU GỐC (MASTER TEMPLATES - ADMIN)
        </button>

        <button
          onClick={() => setActiveSubTab('AUDIT_TRAIL')}
          className={`flex-1 min-w-[220px] py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'AUDIT_TRAIL'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          3. NHẬT KÝ LƯU VẾT DỮ LIỆU (AUDIT TRAIL) ({auditLogs.length})
        </button>
      </div>

      {/* ================= TAB 1: STEP-BY-STEP EXECUTION & BLOCKER ================= */}
      {activeSubTab === 'WORKFLOW' && (
        <div className="space-y-5">
          {/* Stage Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div className="flex flex-wrap gap-1.5">
              {(['ALL', 1, 2, 3, 4, 5] as const).map(st => (
                <button
                  key={String(st)}
                  onClick={() => setStageFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    stageFilter === st
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {st === 'ALL' ? 'Tất cả 5 Giai đoạn (10 Bước)' : `Giai đoạn ${st}`}
                </button>
              ))}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Đã ký số hoàn thành
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-blue-700 font-bold">
                <Unlock className="w-3.5 h-3.5" /> Đang mở khóa thực hiện
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 text-red-600 font-bold">
                <Lock className="w-3.5 h-3.5" /> Đang bị khóa bởi Blocker
              </span>
            </div>
          </div>

          {/* Step-by-Step Cards */}
          <div className="space-y-4">
            {displayedTemplates.map(tpl => {
              const lockInfo = lockStates.find(l => l.templateId === tpl.templateId);
              const sub = submissions.find(s => s.templateId === tpl.templateId);
              const isUnlocked = Boolean(lockInfo?.isUnlocked);
              const isCompleted = Boolean(lockInfo?.isCompleted);

              return (
                <div
                  key={tpl.templateId}
                  className={`p-5 rounded-2xl border transition-all ${
                    isCompleted
                      ? 'bg-emerald-50/40 border-emerald-200 shadow-2xs'
                      : isUnlocked
                      ? 'bg-white border-blue-400 shadow-md ring-2 ring-blue-500/10'
                      : 'bg-slate-100/80 border-slate-200 opacity-85'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-white font-mono text-xs font-extrabold">
                          {tpl.stepCode}
                        </span>
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                          {tpl.stageName}
                        </span>
                        <span className="font-mono text-xs font-bold text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-200">
                          Mẫu: {tpl.formCode} ({tpl.version})
                        </span>

                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ĐÃ HOÀN THÀNH & KÝ SỐ
                          </span>
                        ) : isUnlocked ? (
                          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-blue-300">
                            <Unlock className="w-3.5 h-3.5 text-blue-600" /> BƯỚC HIỆN TẠI (ĐÃ MỞ KHÓA)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-xs font-extrabold px-2.5 py-0.5 rounded-full border border-red-300">
                            <Lock className="w-3.5 h-3.5 text-red-600" /> ĐANG KHÓA CHẶN (BLOCKER)
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-slate-900">{tpl.templateName}</h3>
                      <p className="text-xs text-slate-600">{tpl.description}</p>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                        <span>Căn cứ: <strong className="text-slate-800">{tpl.legalBasis}</strong></span>
                        <span>•</span>
                        <span>Định dạng nhận: <strong className="font-mono text-slate-800">{tpl.allowedUploadExtensions.join(', ')}</strong></span>
                        {tpl.requiresDigitalSignature && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-700 font-bold">Bắt buộc Ký số CA</span>
                          </>
                        )}
                        {tpl.requiresCertifiedCopy && (
                          <>
                            <span>•</span>
                            <span className="text-purple-700 font-bold">Bắt buộc Chứng thực bản sao điện tử</span>
                          </>
                        )}
                      </div>

                      {/* Blocker Warning or Submitted File Info */}
                      {!isUnlocked && lockInfo?.blockerReason && (
                        <div className="mt-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
                          <Lock className="w-4 h-4 text-red-600 shrink-0" />
                          <span>{lockInfo.blockerReason}</span>
                        </div>
                      )}

                      {sub && (
                        <div className="mt-2 p-3 rounded-xl bg-white border border-emerald-200 text-xs flex flex-col sm:flex-row justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-emerald-600" />
                              Hồ sơ đã nộp: <span className="font-mono text-blue-700">{sub.uploadedFileName}</span> ({sub.fileSizeMB} MB)
                            </div>
                            <div className="text-[11px] text-slate-600">
                              Người nộp: <strong>{sub.uploadedByName}</strong> ({sub.uploadedByEmail}) lúc {sub.uploadedAt}
                            </div>
                          </div>
                          <div className="text-right font-mono text-[11px] text-slate-500">
                            <div className="font-bold text-emerald-700">{sub.signerCertificateId}</div>
                            <div>{sub.sha256Hash}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons: Download Master Template & Upload Signed File */}
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2 w-full lg:w-64 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDownloadMasterTemplate(tpl)}
                        className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-4 h-4 text-blue-600" />
                        Tải Biểu Mẫu Gốc (.{tpl.templateFileFormat})
                      </button>

                      <button
                        type="button"
                        disabled={!isUnlocked}
                        onClick={() => handleOpenUploadModal(tpl)}
                        className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          !isUnlocked
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                            : isCompleted
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                        }`}
                      >
                        {!isUnlocked ? (
                          <>
                            <Lock className="w-4 h-4" /> Đang Khóa (Chờ bước trước)
                          </>
                        ) : isCompleted ? (
                          <>
                            <Upload className="w-4 h-4" /> Cập Nhật Lại Hồ Sơ Ký Số
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" /> Upload Hồ Sơ & Ký Số
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 2: MASTER TEMPLATES REPOSITORY (ADMIN ONLY EDIT) ================= */}
      {activeSubTab === 'MASTER_TEMPLATES' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-600" />
                KHO BIỂU MẪU GỐC PHÁP LÝ XÂY DỰNG 2026 (MASTER TEMPLATES REPOSITORY)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Quản lý phiên bản biểu mẫu chuẩn hóa theo Nghị định 217, 206, 210, 207, 212, 193/2026/NĐ-CP, TT 36/2026/TT-BXD & QĐ 1040/QĐ-BXD
              </p>
            </div>

            <div className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border ${
              isAdmin
                ? 'bg-purple-50 text-purple-900 border-purple-300'
                : 'bg-amber-50 text-amber-900 border-amber-300'
            }`}>
              <KeyRound className="w-4 h-4" />
              {isAdmin
                ? 'Quyền ADMIN: Được phép tải lên & cập nhật phiên bản Biểu mẫu gốc'
                : `Quyền hiện tại (${actorRole}): Chỉ được tải xuống (Chỉ ADMIN được cập nhật mẫu gốc)`}
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-100 text-slate-800 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Bước</th>
                  <th className="p-3">Mã Biểu Mẫu</th>
                  <th className="p-3 min-w-[260px]">Tên Biểu Mẫu Gốc & Mô Tả</th>
                  <th className="p-3 min-w-[200px]">Căn Cứ Pháp Lý 2026</th>
                  <th className="p-3 text-center">Định Dạng</th>
                  <th className="p-3">Phiên Bản (Versioning)</th>
                  <th className="p-3 text-center">Thao Tác (RBAC)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {templates.map(tpl => {
                  const isEditing = editingTemplateId === tpl.templateId;
                  return (
                    <tr key={tpl.templateId} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-extrabold text-slate-900">{tpl.stepCode}</td>
                      <td className="p-3 font-mono font-bold text-purple-700">{tpl.formCode}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{tpl.templateName}</div>
                        {isEditing ? (
                          <input
                            type="text"
                            value={draftDescription}
                            onChange={e => setDraftDescription(e.target.value)}
                            className="w-full mt-1 px-2 py-1 border rounded bg-white text-xs"
                          />
                        ) : (
                          <div className="text-[11px] text-slate-500 mt-0.5">{tpl.description}</div>
                        )}
                      </td>
                      <td className="p-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={draftLegalBasis}
                            onChange={e => setDraftLegalBasis(e.target.value)}
                            className="w-full px-2 py-1 border rounded bg-white text-xs font-semibold"
                          />
                        ) : (
                          <span className="font-semibold text-slate-800">{tpl.legalBasis}</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-mono font-bold text-[11px] border border-blue-200">
                          .{tpl.templateFileFormat}
                        </span>
                      </td>
                      <td className="p-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={draftVersion}
                            onChange={e => setDraftVersion(e.target.value)}
                            className="w-28 px-2 py-1 border rounded bg-white font-mono font-bold text-purple-800"
                          />
                        ) : (
                          <div>
                            <span className="font-mono font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {tpl.version}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {tpl.updatedAt} ({tpl.updatedByAdmin})
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {isEditing ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleSaveAdminTemplateUpdate(tpl.templateId)}
                              className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                              title="Lưu phiên bản mới"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingTemplateId(null)}
                              className="p-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                              title="Hủy"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleDownloadMasterTemplate(tpl)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold inline-flex items-center gap-1 border border-slate-300"
                            >
                              <Download className="w-3.5 h-3.5 text-blue-600" /> Tải mẫu
                            </button>
                            {isAdmin ? (
                              <button
                                onClick={() => handleStartAdminEdit(tpl)}
                                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold inline-flex items-center gap-1"
                              >
                                <Pencil className="w-3.5 h-3.5" /> Cập nhật Bản mới
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-semibold px-2 py-1 bg-slate-50 rounded border border-slate-200">
                                Khóa sửa (Admin Only)
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 3: IMMUTABLE AUDIT TRAIL ================= */}
      {activeSubTab === 'AUDIT_TRAIL' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" />
                NHẬT KÝ LƯU VẾT DỮ LIỆU BẤT BIẾN (IMMUTABLE WORKFLOW AUDIT TRAIL)
              </h3>
              <p className="text-xs text-slate-500">
                Tự động ghi nhận Thời gian (Timestamp), Mã định danh cá nhân/tổ chức, Phiên bản biểu mẫu & Mã băm chữ ký số cho mọi thao tác
              </p>
            </div>
            <span className="text-xs font-mono font-bold bg-slate-900 text-emerald-400 px-3 py-1 rounded-full">
              Tổng số bản ghi Audit: {auditLogs.length}
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-100 text-slate-800 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Thời Gian (Timestamp)</th>
                  <th className="p-3">Bước / Dự Án</th>
                  <th className="p-3">Hành Động</th>
                  <th className="p-3">Định Danh Cá Nhân / Tổ Chức</th>
                  <th className="p-3">Tệp Hồ Sơ & Phiên Bản</th>
                  <th className="p-3">Xác Thực Ký Số / SHA-256</th>
                  <th className="p-3">Chi Tiết Lưu Vết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map(log => (
                  <tr key={log.auditId} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">{log.timestamp}</td>
                    <td className="p-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                      [{log.projectId}] {log.stepCode}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        log.actionType === 'UPLOAD_SIGNED_SUBMISSION'
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.actionType === 'ADMIN_UPDATE_MASTER_TEMPLATE'
                          ? 'bg-purple-100 text-purple-800'
                          : log.actionType === 'BLOCKER_REJECTED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {log.actionType}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{log.actorName}</div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {log.actorEmail} | {log.actorRole} ({log.organizationCode})
                      </div>
                    </td>
                    <td className="p-3 font-mono">
                      <div className="font-bold text-slate-800">{log.fileName}</div>
                      <div className="text-[10px] text-purple-700">Version: {log.versionTag}</div>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-emerald-700">{log.digitalSignatureInfo}</td>
                    <td className="p-3 text-slate-600">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODAL UPLOAD HỒ SƠ & KÝ SỐ SMARTCA ================= */}
      {uploadingTemplate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-mono font-extrabold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded">
                  {uploadingTemplate.stepCode} • {uploadingTemplate.formCode}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  TẢI LÊN HỒ SƠ HOÀN THIỆN & XÁC THỰC CHỮ KÝ SỐ
                </h3>
              </div>
              <button onClick={() => setUploadingTemplate(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmUploadStep} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-800">{uploadingTemplate.templateName}</div>
                <div className="text-slate-500">Căn cứ: {uploadingTemplate.legalBasis}</div>
                <div className="text-blue-700 font-mono font-bold">
                  Định dạng bắt buộc: {uploadingTemplate.allowedUploadExtensions.join(', ')}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Chọn Tệp Hồ Sơ Từ Máy Tính (hoặc nhập tên tệp đính kèm)
                </label>
                <input
                  type="file"
                  accept={uploadingTemplate.allowedUploadExtensions.join(',')}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setUploadFileName(f.name);
                      setUploadFileSizeMB(Number((f.size / (1024 * 1024)).toFixed(2)) || 2.5);
                    }
                  }}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mb-2"
                />
                <input
                  type="text"
                  value={uploadFileName}
                  onChange={e => setUploadFileName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mã Chứng Thư Số / Định Danh Chữ Ký Số (SmartCA / USB Token)
                </label>
                <input
                  type="text"
                  value={signerCertId}
                  onChange={e => setSignerCertId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-semibold text-emerald-800 bg-emerald-50/40"
                />
              </div>

              <div className="space-y-2 p-3.5 bg-blue-50/50 rounded-xl border border-blue-200">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900">
                  <input
                    type="checkbox"
                    checked={hasDigitalSignature}
                    onChange={e => setHasDigitalSignature(e.target.checked)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span>Xác nhận tệp đính kèm đã được Ký số hợp lệ (SmartCA / VGCA)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-900">
                  <input
                    type="checkbox"
                    checked={hasCertifiedCopy}
                    onChange={e => setHasCertifiedCopy(e.target.checked)}
                    className="w-4 h-4 accent-purple-600"
                  />
                  <span>
                    Xác nhận Bản sao điện tử được chứng thực từ bản chính
                    {uploadingTemplate.requiresCertifiedCopy ? ' (Bắt buộc ở bước này)' : ' (Khuyến nghị)'}
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUploadingTemplate(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" /> Xác Thực Ký Số & Hoàn Thành Bước
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
