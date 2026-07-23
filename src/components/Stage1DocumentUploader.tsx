import React, { useState, useEffect } from 'react';
import { Stage1DocumentRecord } from '../pms/T2_Services';
import { PmsHandlers } from '../pms/T3_Handlers';
import { formatDateTimeVN } from '../pms/T1_Utils';
import { PMS_CONFIG } from '../pms/T0_Config';
import {
  Upload,
  FileText,
  FileSpreadsheet,
  FileCode,
  Archive,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  FolderTree,
  User,
  Clock,
  HardDrive
} from 'lucide-react';
import { toast } from 'sonner';

interface Stage1DocumentUploaderProps {
  projectId: string;
  stepId: number;
  stepName?: string;
  stepConfig?: {
    stepId: number;
    stepName: string;
    responsibleUnit: string;
    requiredDocs: ReadonlyArray<{ docTypeId: string; docTypeName: string; isMandatory: boolean }>;
  };
  requiredDocs?: ReadonlyArray<{ docTypeId: string; docTypeName: string; isMandatory: boolean }>;
  uploadedDocs?: Stage1DocumentRecord[];
  onUploadSuccess: () => void;
}

export default function Stage1DocumentUploader({
  projectId,
  stepId,
  stepName,
  stepConfig,
  requiredDocs: propRequiredDocs,
  uploadedDocs: propUploadedDocs,
  onUploadSuccess
}: Stage1DocumentUploaderProps) {
  const docsList = propRequiredDocs || stepConfig?.requiredDocs || [];
  const uploadedList = propUploadedDocs || [];

  const [selectedDocTypeId, setSelectedDocTypeId] = useState<string>(docsList[0]?.docTypeId || '');
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [uploaderName, setUploaderName] = useState<string>('Nguyễn Văn Hùng (Cán bộ QLDA)');
  const [smartCaSigned, setSmartCaSigned] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  useEffect(() => {
    if (docsList.length > 0 && !selectedDocTypeId) {
      setSelectedDocTypeId(docsList[0].docTypeId);
    }
  }, [stepId, docsList]);

  const currentDocType = docsList.find(d => d.docTypeId === selectedDocTypeId) || docsList[0] || {
    docTypeId: 'DOC_GENERIC',
    docTypeName: 'Tài liệu bổ sung',
    isMandatory: false
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectId) {
      toast.error('Vui lòng chọn Dự án trước khi tải lên tài liệu');
      return;
    }

    if (!fileInput) {
      toast.error('Vui lòng chọn tệp tài liệu cần nộp');
      return;
    }

    const fileSizeMB = Number((fileInput.size / (1024 * 1024)).toFixed(2));
    if (fileSizeMB > PMS_CONFIG.MAX_FILE_SIZE_MB) {
      toast.error(`Kích thước file (${fileSizeMB} MB) vượt quá giới hạn tối đa 50MB!`);
      return;
    }

    setIsUploading(true);

    // Call T3 Handler API
    const res = PmsHandlers.uploadStage1DocumentApi({
      projectId,
      stepId,
      docTypeId: currentDocType.docTypeId,
      docTypeName: currentDocType.docTypeName,
      fileName: fileInput.name,
      fileSizeMB,
      uploaderName,
      smartCaSigned
    });

    setIsUploading(false);

    if (res.success) {
      toast.success(res.message);
      setFileInput(null);
      onUploadSuccess();
    } else {
      toast.error(res.message);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="w-5 h-5 text-red-500 shrink-0" />;
    if (ext === 'xlsx' || ext === 'xls') return <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />;
    if (ext === 'zip' || ext === 'rar') return <Archive className="w-5 h-5 text-purple-600 shrink-0" />;
    return <FileCode className="w-5 h-5 text-blue-600 shrink-0" />;
  };

  const currentStepDocs = uploadedList.filter(d => d.stepId === stepId);

  return (
    <div className="space-y-6">
      {/* Upload Form */}
      <form onSubmit={handleUploadSubmit} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 text-xs">
        <h5 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
          <Upload className="w-4 h-4 text-blue-600" /> TẢI LÊN HỒ SƠ & VĂN BẢN NỘP BƯỚC {stepId}
        </h5>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-700 font-bold mb-1">LOẠI VĂN BẢN / HỒ SƠ YÊU CẦU *</label>
            <select
              value={selectedDocTypeId}
              onChange={e => setSelectedDocTypeId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 font-medium text-slate-900 outline-none"
            >
              {docsList.map(doc => (
                <option key={doc.docTypeId} value={doc.docTypeId}>
                  {doc.isMandatory ? '🔴 [BẮT BUỘC]' : '🔵 [BỔ SUNG]'} {doc.docTypeName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">CÁN BỘ THỰC HIỆN NỘP</label>
            <input
              type="text"
              value={uploaderName}
              onChange={e => setUploaderName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-800 outline-none"
            />
          </div>
        </div>

        {/* File Drag Drop Input */}
        <div>
          <label className="block text-slate-700 font-bold mb-1">TỆP TÀI LIỆU HỒ SƠ (PDF, XLSX, DOCX, ZIP ≤ 50MB) *</label>
          <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-4 text-center transition-all bg-slate-50">
            <input
              type="file"
              onChange={e => setFileInput(e.target.files?.[0] || null)}
              className="hidden"
              id="stage1-file-input"
            />
            <label htmlFor="stage1-file-input" className="cursor-pointer flex flex-col items-center justify-center gap-1.5">
              <Upload className="w-8 h-8 text-blue-500" />
              {fileInput ? (
                <span className="font-bold text-emerald-700">{fileInput.name} ({(fileInput.size / (1024 * 1024)).toFixed(2)} MB)</span>
              ) : (
                <>
                  <span className="font-bold text-slate-700">Bấm để chọn tệp hoặc Kéo-Thả file vào đây</span>
                  <span className="text-[11px] text-slate-400">Hỗ trợ PDF, Excel, Word, CAD, ZIP mã hóa SmartCA</span>
                </>
              )}
            </label>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={smartCaSigned}
              onChange={e => setSmartCaSigned(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded"
            />
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Xác thực Ký số Chuyên dùng SmartCA-BXD trước khi nộp</span>
          </label>

          <button
            type="submit"
            disabled={isUploading}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            <span>{isUploading ? 'Đang Nộp Hồ Sơ...' : 'Nộp Hồ Sơ Về Ban QLDA'}</span>
          </button>
        </div>
      </form>

      {/* Uploaded Documents List */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 text-xs">
        <h5 className="font-bold text-slate-900 text-sm flex items-center justify-between border-b border-slate-100 pb-2">
          <span className="flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-emerald-600" /> DANH SÁCH HỒ SƠ ĐÃ NỘP BƯỚC {stepId} ({currentStepDocs.length})
          </span>
        </h5>

        {currentStepDocs.length === 0 ? (
          <div className="text-center py-6 text-slate-400 space-y-1">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
            <p>Chưa có hồ sơ nào được nộp cho Bước {stepId}. Vui lòng nộp các tài liệu bắt buộc ở trên.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {currentStepDocs.map(doc => (
              <div key={doc.docId} className="py-2.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 hover:bg-slate-50 px-2 rounded-lg">
                <div className="flex items-start gap-2.5">
                  {getFileIcon(doc.fileName)}
                  <div>
                    <div className="font-bold text-slate-900">{doc.docTypeName}</div>
                    <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
                      <span>{doc.fileName}</span>
                      <span>({doc.fileSizeMB} MB)</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                  <div className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" /> {doc.uploaderName}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> {formatDateTimeVN(doc.uploadDate)}
                  </div>
                  {doc.smartCaSigned && (
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" /> SmartCA
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
