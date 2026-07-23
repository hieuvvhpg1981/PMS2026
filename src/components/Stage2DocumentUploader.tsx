import React, { useState } from 'react';
import { Stage2DocumentRecord } from '../pms/T2_Services';
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

interface Stage2DocumentUploaderProps {
  projectId: string;
  stepId: number;
  stepName: string;
  requiredDocs: ReadonlyArray<{ docTypeId: string; docTypeName: string; isMandatory: boolean }>;
  uploadedDocs: Stage2DocumentRecord[];
  onUploadSuccess: () => void;
}

export default function Stage2DocumentUploader({
  projectId,
  stepId,
  stepName,
  requiredDocs,
  uploadedDocs,
  onUploadSuccess
}: Stage2DocumentUploaderProps) {
  const [selectedDocTypeId, setSelectedDocTypeId] = useState<string>(requiredDocs[0]?.docTypeId || '');
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [uploaderName, setUploaderName] = useState<string>('Nguyễn Thanh Tùng (Phòng Kỹ thuật / Kế hoạch)');
  const [smartCaSigned, setSmartCaSigned] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const currentDocType = requiredDocs.find(d => d.docTypeId === selectedDocTypeId) || requiredDocs[0];

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectId) {
      toast.error('Vui lòng chọn Dự án trước khi tải lên tài liệu');
      return;
    }

    if (!fileInput) {
      toast.error('Vui lòng chọn tệp tài liệu GĐ 2 cần nộp');
      return;
    }

    const fileSizeMB = Number((fileInput.size / (1024 * 1024)).toFixed(2));
    if (fileSizeMB > PMS_CONFIG.MAX_FILE_SIZE_MB) {
      toast.error(`Kích thước file (${fileSizeMB} MB) vượt quá giới hạn tối đa ${PMS_CONFIG.MAX_FILE_SIZE_MB}MB!`);
      return;
    }

    setIsUploading(true);

    const res = PmsHandlers.uploadStage2DocumentApi({
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
    if (ext === 'dwg' || ext === 'dxf') return <FileCode className="w-5 h-5 text-amber-600 shrink-0" />;
    if (ext === 'zip' || ext === 'rar') return <Archive className="w-5 h-5 text-purple-600 shrink-0" />;
    return <FileText className="w-5 h-5 text-blue-600 shrink-0" />;
  };

  const currentStepDocs = uploadedDocs.filter(d => d.stepId === stepId);

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Upload className="w-4 h-4 text-indigo-600" />
            HỒ SƠ TÀI LIỆU GIAI ĐOẠN 2 ({stepName.toUpperCase()})
          </h4>
          <p className="text-xs text-slate-500">
            Hỗ trợ định dạng PDF, DOCX, XLSX, DWG, ZIP (Dung lượng tối đa 100MB/tệp). Tự động lưu cấu trúc thư mục PMS Storage GĐ 2.
          </p>
        </div>
        <span className="text-[11px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-200 font-mono">
          /PMS_Storage/{projectId || 'DEFAULT'}/Giai_Doan_2/Buoc_{stepId}/
        </span>
      </div>

      {/* Upload Form Box */}
      <form onSubmit={handleUploadSubmit} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Loại Hồ Sơ Cần Nộp *</label>
            <select
              value={selectedDocTypeId}
              onChange={e => setSelectedDocTypeId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white outline-none"
            >
              {requiredDocs.map(d => (
                <option key={d.docTypeId} value={d.docTypeId}>
                  {d.docTypeName} {d.isMandatory ? '(Bắt buộc)' : '(Tùy chọn)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Người Tải Lên / Phòng Ban Thẩm Định</label>
            <input
              type="text"
              value={uploaderName}
              onChange={e => setUploaderName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Chọn Tệp Đính Kèm (Max 100MB)</label>
          <input
            type="file"
            accept=".pdf,.docx,.doc,.xlsx,.xls,.dwg,.dxf,.zip,.rar"
            onChange={e => setFileInput(e.target.files?.[0] || null)}
            className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`smartCaCheck-GDA2-${stepId}`}
              checked={smartCaSigned}
              onChange={e => setSmartCaSigned(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
            />
            <label htmlFor={`smartCaCheck-GDA2-${stepId}`} className="text-xs font-semibold text-slate-700 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Xác thực Ký số SmartCA trên tệp GĐ 2
            </label>
          </div>

          <button
            type="submit"
            disabled={isUploading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5" />
            {isUploading ? 'Đang tải...' : 'Tải Lên Thư Mục PMS Storage GĐ 2'}
          </button>
        </div>
      </form>

      {/* Uploaded Documents List Matrix */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-slate-700 uppercase flex items-center justify-between">
          <span>DANH MỤC TÀI LIỆU GĐ 2 ĐÃ TẢI LÊN (BƯỚC {stepId})</span>
          <span className="text-slate-500 font-mono">{currentStepDocs.length} tệp</span>
        </div>

        <div className="space-y-2">
          {requiredDocs.map(req => {
            const uploadedRecord = currentStepDocs.find(d => d.docTypeId === req.docTypeId);
            return (
              <div
                key={req.docTypeId}
                className={`p-3 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 transition-all ${
                  uploadedRecord ? 'bg-emerald-50/50 border-emerald-200' : req.isMandatory ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {uploadedRecord ? getFileIcon(uploadedRecord.fileName) : <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />}
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <span>{req.docTypeName}</span>
                      {req.isMandatory && (
                        <span className={`text-[10px] px-2 py-0.2 rounded font-semibold ${uploadedRecord ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {uploadedRecord ? 'Đã nộp' : 'Bắt buộc nộp'}
                        </span>
                      )}
                    </div>
                    {uploadedRecord ? (
                      <div className="text-[11px] text-slate-600 mt-0.5 space-y-0.5">
                        <div className="font-mono text-indigo-700 font-medium">{uploadedRecord.fileName} ({uploadedRecord.fileSizeMB} MB)</div>
                        <div className="flex flex-wrap items-center gap-3 text-slate-500">
                          <span className="flex items-center gap-1"><User className="w-3 h-3" /> {uploadedRecord.uploadedBy}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDateTimeVN(uploadedRecord.uploadTimestamp)}</span>
                          <span className="flex items-center gap-1 font-mono text-slate-400"><FolderTree className="w-3 h-3" /> {uploadedRecord.storagePath}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic">Chưa tải lên hồ sơ đính kèm.</div>
                    )}
                  </div>
                </div>

                {uploadedRecord && uploadedRecord.smartCaSigned && (
                  <span className="bg-emerald-100 text-emerald-800 text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> SmartCA Signed
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
