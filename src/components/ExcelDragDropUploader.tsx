import React, { useState } from 'react';
import { parseExcelArrayBufferToJSON, formatVND } from '../pms/T1_Utils';
import { PmsService } from '../pms/T2_Services';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface ExcelDragDropUploaderProps {
  projectId: string;
  schemaType: 'GANTT' | 'BOQ' | 'GPMB' | 'KHLCNT' | 'CONSULTING';
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export default function ExcelDragDropUploader({
  projectId,
  schemaType,
  isOpen,
  onClose,
  onImportSuccess
}: ExcelDragDropUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [errorRows, setErrorRows] = useState<Array<{ rowNum: number; errorMsg: string }>>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (selectedFile: File) => {
    setFile(selectedFile);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      const res = parseExcelArrayBufferToJSON(buffer, schemaType);
      setParsedRows(res.parsedData);
      setErrorRows(res.errorRows);
      setIsProcessing(false);
      if (res.parsedData.length > 0) {
        toast.info(`Đã bóc tách thành công ${res.parsedData.length} dòng dữ liệu từ ${selectedFile.name}`);
      } else {
        toast.error('Không tìm thấy dòng dữ liệu hợp lệ trong file');
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleRowChange = (index: number, field: string, value: any) => {
    const updated = [...parsedRows];
    updated[index][field] = value;
    if (schemaType === 'BOQ') {
      const qty = Number(updated[index].quantity) || 0;
      const price = Number(updated[index].unitPrice) || 0;
      updated[index].totalAmount = qty * price;
    }
    setParsedRows(updated);
  };

  const handleRemoveRow = (index: number) => {
    setParsedRows(parsedRows.filter((_, i) => i !== index));
  };

  const handleConfirmImport = () => {
    if (parsedRows.length === 0) {
      toast.error('Chưa có dòng dữ liệu hợp lệ nào để Import');
      return;
    }

    try {
      const res = PmsService.batchInsertScheduleAndBOQ(projectId, parsedRows, schemaType as any);
      toast.success(`Import thành công ${res.insertedCount} dòng dữ liệu vào CSDL Dự án ${projectId}!`);
      onImportSuccess();
      onClose();
    } catch (err: any) {
      toast.error(`Lỗi Import: ${err?.message}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              UPLOAD & BÓC TÁCH DỮ LIỆU EXCEL TỰ ĐỘNG ({schemaType})
            </h3>
            <p className="text-xs text-slate-500">Đọc tệp chuẩn .xlsx / .xls. Tự động bóc tách dữ liệu theo loại file</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Drag & Drop Area */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
              isDragOver ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
            }`}
          >
            <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <div className="text-xs font-bold text-slate-800">
              Kéo thả tệp Excel (.xlsx, .xls) vào đây hoặc <label htmlFor="excelFileInput" className="text-emerald-600 hover:underline cursor-pointer">chọn tệp từ máy tính</label>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Hỗ trợ định dạng .xlsx chuẩn SheetJS</p>
            <input
              id="excelFileInput"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              className="hidden"
            />
          </div>

          {/* Error Rows Banner */}
          {errorRows.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-amber-900 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" /> Phát hiện {errorRows.length} dòng có lưu ý dữ liệu
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
                {errorRows.map((err, idx) => (
                  <li key={idx}>Dòng {err.rowNum}: {err.errorMsg}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Parsed Rows Preview Table with Inline Editing */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                <span>DỮ LIỆU BÓC TÁCH ĐÚNG CỘT (XEM TRƯỚC & CHỈNH SỬA TRỰC TIẾP)</span>
                <span className="font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  {parsedRows.length} Dòng dữ liệu
                </span>
              </div>

              <div className="overflow-x-auto max-h-60 border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left text-slate-600">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2">STT</th>
                      {schemaType === 'CONSULTING' ? (
                        <>
                          <th className="px-3 py-2">Mã Mốc</th>
                          <th className="px-3 py-2">Tên Sản Phẩm Tư Vấn</th>
                          <th className="px-3 py-2">Ngày Bàn Giao</th>
                          <th className="px-3 py-2 text-center">% Hoàn Thành</th>
                          <th className="px-3 py-2 text-right">Giá Trị (VND)</th>
                        </>
                      ) : schemaType === 'BOQ' ? (
                        <>
                          <th className="px-3 py-2">Cột A: Mã ĐM</th>
                          <th className="px-3 py-2">Cột B: Tên Công Tác</th>
                          <th className="px-3 py-2">Cột C: ĐVT</th>
                          <th className="px-3 py-2 text-right">Cột D: Khối Lượng</th>
                          <th className="px-3 py-2 text-right">Đơn Giá Tổng (VND)</th>
                          <th className="px-3 py-2 text-right">Cột H: Thành Tiền (VND)</th>
                        </>
                      ) : (
                        <>
                          <th className="px-3 py-2">Mã Dòng</th>
                          <th className="px-3 py-2">Tên Chi Tiết</th>
                          <th className="px-3 py-2">Thông Tin Phụ</th>
                          <th className="px-3 py-2 text-right">Số Lượng / Giá Trị</th>
                        </>
                      )}
                      <th className="px-3 py-2 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-1.5 font-mono text-slate-400">{idx + 1}</td>
                        {schemaType === 'CONSULTING' ? (
                          <>
                            <td className="px-3 py-1.5 font-mono font-bold text-blue-700">{row.productId}</td>
                            <td className="px-3 py-1.5 font-bold text-slate-900">{row.productName}</td>
                            <td className="px-3 py-1.5 font-mono">{row.deliveryDate}</td>
                            <td className="px-3 py-1.5 text-center font-bold text-emerald-700">{row.completionPct}%</td>
                            <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-900">{formatVND(row.allocatedAmount)}</td>
                          </>
                        ) : schemaType === 'BOQ' ? (
                          <>
                            <td className="px-3 py-1.5 font-mono font-bold text-blue-700">{row.itemCode}</td>
                            <td className="px-3 py-1.5 font-bold text-slate-900">{row.itemName}</td>
                            <td className="px-3 py-1.5">{row.unit}</td>
                            <td className="px-3 py-1.5 text-right font-mono font-bold">{row.quantity}</td>
                            <td className="px-3 py-1.5 text-right font-mono">{formatVND(row.unitPrice)}</td>
                            <td className="px-3 py-1.5 text-right font-mono font-bold text-emerald-700">{formatVND(row.quantity * row.unitPrice)}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-1.5 font-mono font-bold text-blue-700">{row.householdId || row.packageId || row.taskId}</td>
                            <td className="px-3 py-1.5 font-bold text-slate-900">{row.ownerName || row.packageName || row.taskName}</td>
                            <td className="px-3 py-1.5">{row.mapPlotNo || row.procurementMethod || row.assignedDept}</td>
                            <td className="px-3 py-1.5 text-right font-mono font-bold">{formatVND(row.totalCompensation || row.packagePrice || row.budgetAllocated)}</td>
                          </>
                        )}
                        <td className="px-3 py-1.5 text-center">
                          <button onClick={() => handleRemoveRow(idx)} className="text-red-500 hover:text-red-700 p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all"
          >
            Hủy Bỏ
          </button>

          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={parsedRows.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-40"
          >
            <CheckCircle2 className="w-4 h-4" /> Xác Nhận Nộp Dữ Liệu Excel
          </button>
        </div>
      </div>
    </div>
  );
}
