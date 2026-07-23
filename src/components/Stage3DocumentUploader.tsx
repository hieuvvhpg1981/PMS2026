import React, { useState } from 'react';
import { PmsHandlers } from '../pms/T3_Handlers';
import { Stage3DocumentRecord } from '../pms/T2_Services';
import {
  Upload,
  FileCheck2,
  CheckCircle2,
  ShieldCheck,
  FolderArchive,
  FileText,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface Stage3DocumentUploaderProps {
  projectId: string;
  stepId: number;
  stepName: string;
  requiredDocs: ReadonlyArray<{ docTypeId: string; docTypeName: string; isMandatory: boolean }>;
  uploadedDocs: Stage3DocumentRecord[];
  onUploadSuccess: () => void;
}

export default function Stage3DocumentUploader({
  projectId,
  stepId,
  stepName,
  requiredDocs,
  uploadedDocs,
  onUploadSuccess
}: Stage3DocumentUploaderProps) {
  const [selectedDocTypeId, setSelectedDocTypeId] = useState<string>(requiredDocs[0]?.docTypeId || '');
  const [file, setFile] = useState<File | null>(null);
  const [uploaderName, setUploaderName] = useState<string>('Cán bộ Ban QLDA / Đấu thầu');
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const stepDocs = uploadedDocs.filter(d => d.stepId === stepId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Vui lòng chọn tệp văn bản/hồ sơ để tải lên!');
      return;
    }

    const docTypeConfig = requiredDocs.find(d => d.docTypeId === selectedDocTypeId);
    const docTypeName = docTypeConfig ? docTypeConfig.docTypeName : 'Văn bản đính kèm';
    const fileSizeMB = Number((file.size / (1024 * 1024)).toFixed(2));

    setIsUploading(true);

    setTimeout(() => {
      const res = PmsHandlers.uploadStage3DocumentApi({
        projectId,
        stepId,
        docTypeId: selectedDocTypeId,
        docTypeName,
        fileName: file.name,
        fileSizeMB,
        uploaderName
      });

      setIsUploading(false);

      if (res.success) {
        toast.success(res.message);
        setFile(null);
        onUploadSuccess();
      } else {
        toast.error(res.message);
      }
    }, 500);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FolderArchive className="w-5 h-5 text-blue-600" />
            HỒ SƠ TÀI LIỆU ĐÍNH KÈM GIAI ĐOẠN 3: {stepName.toUpperCase()}
          </h3>
          <p className="text-xs text-slate-500">Lưu trữ tự động thư mục chuẩn: /PMS_Storage/{projectId}/Giai_Doan_3/</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">Đã nộp:</span>
          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
            {stepDocs.length} / {requiredDocs.length} Tài liệu
          </span>
        </div>
      </div>

      {/* Mandatory Docs Checklist Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {requiredDocs.map(req => {
          const uploaded = stepDocs.find(d => d.docTypeId === req.docTypeId);
          return (
            <div
              key={req.docTypeId}
              className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                uploaded
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                  : req.isMandatory
                  ? 'bg-amber-50/60 border-amber-200 text-amber-900'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                {uploaded ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <div className="truncate">
                  <div className="font-bold flex items-center gap-1">
                    {req.docTypeName}
                    {req.isMandatory && <span className="text-red-500 font-bold">*</span>}
                  </div>
                  {uploaded ? (
                    <div className="text-[11px] text-emerald-700 font-mono truncate">
                      File: {uploaded.fileName} ({uploaded.fileSizeMB} MB)
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400">Chưa nộp văn bản</div>
                  )}
                </div>
              </div>

              {uploaded && (
                <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px] shrink-0">
                  SmartCA Active
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Document Upload Form */}
      <form onSubmit={handleUpload} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
        <div className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
          <Upload className="w-4 h-4 text-blue-600" /> ĐĂNG TẢI HỒ SƠ ĐÍNH KÈM (PDF / DOCX / XLSX / ZIP UP TO 100MB)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Loại Văn Bản Trình Duyệt</label>
            <select
              value={selectedDocTypeId}
              onChange={e => setSelectedDocTypeId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none font-medium"
            >
              {requiredDocs.map(req => (
                <option key={req.docTypeId} value={req.docTypeId}>
                  {req.docTypeName} {req.isMandatory ? '(Bắt buộc)' : '(Tùy chọn)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Người Nộp / Cán Bộ Phụ Trách</label>
            <input
              type="text"
              value={uploaderName}
              onChange={e => setUploaderName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Chọn Tệp Đính Kèm</label>
            <input
              type="file"
              accept=".pdf,.docx,.xlsx,.zip"
              onChange={handleFileChange}
              className="w-full px-2 py-1.5 border border-slate-300 rounded-xl bg-white text-xs"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Tự động đóng dấu Ký số SmartCA khi nộp hồ sơ thành công
          </div>

          <button
            type="submit"
            disabled={isUploading || !file}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-40"
          >
            {isUploading ? <FileCheck2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Xác Nhận Đăng Tải Hồ Sơ
          </button>
        </div>
      </form>

      {/* Uploaded Documents List */}
      {stepDocs.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="text-xs font-bold text-slate-700">DANH SÁCH TỆP ĐÃ LƯU TRỮ HỆ THỐNG</div>
          <div className="space-y-2">
            {stepDocs.map(doc => (
              <div key={doc.docId} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <div>
                    <div className="font-bold text-slate-900">{doc.docTypeName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {doc.fileName} | Path: <span className="text-blue-700">{doc.storagePath}</span> | {doc.uploadTimestamp.substring(0, 10)}
                    </div>
                  </div>
                </div>
                <div className="text-right font-mono text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-[11px]">
                  {doc.smartCaSigner || 'SmartCA Active'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
