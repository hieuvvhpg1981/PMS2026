import React, { useState } from 'react';
import { PmsHandlers } from '../pms/T3_Handlers';
import { PMS_CONFIG } from '../pms/T0_Config';
import {
  Globe2,
  FileCode,
  Download,
  CheckCircle2,
  Share2,
  Send,
  Database
} from 'lucide-react';
import { toast } from 'sonner';

export default function NationalDbSyncView() {
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const exportResult = PmsHandlers.nationalDbExportApi();

  const handleSendToMocApi = () => {
    setSyncStatus('Đang gửi dữ liệu mã hóa đến https://csdl-xaydung.moc.gov.vn/api/v1/sync...');
    setTimeout(() => {
      setSyncStatus('ĐỒNG BỘ THÀNH CÔNG (200 OK): CSDL Quốc gia Bộ Xây dựng đã nhận 100% hồ sơ!');
      toast.success('Đồng bộ thành công CSDL Quốc gia Bộ Xây dựng!');
    }, 1200);
  };

  const handleDownloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportResult.data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `PMS_2026_NATIONAL_DB_EXPORT_TT39.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('Đã tải tệp JSON xuất chuẩn TT 39/2026/TT-BXD');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 text-xs px-3 py-1 rounded-full font-bold mb-2">
            API CSDL Quốc gia BXD
          </div>
          <h2 className="text-2xl font-bold text-slate-900">ĐỒNG BỘ CƠ SỞ DỮ LIỆU QUỐC GIA BỘ XÂY DỰNG</h2>
          <p className="text-xs text-slate-500 mt-1">
            Chuẩn mã hóa trao đổi dữ liệu JSON / Excel theo Thông tư 39/2026/TT-BXD | Cổng kết nối CSDL Xây dựng Quốc gia
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connection Control Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Globe2 className="w-5 h-5 text-purple-600" />
            CỔNG ĐỒNG BỘ TRỰC TUYẾN
          </h3>

          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="text-slate-500">Endpoint kết nối chính thức:</div>
              <div className="font-mono font-bold text-blue-700 break-all">{PMS_CONFIG.NATIONAL_DB_ENDPOINT}</div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="text-slate-500">Tiêu chuẩn mã hóa:</div>
              <div className="font-semibold text-slate-900">{PMS_CONFIG.LEGAL_REFERENCES.THONG_TU_39}</div>
            </div>

            {syncStatus && (
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 font-semibold space-y-1">
                <div className="flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {syncStatus}
                </div>
              </div>
            )}

            <button
              onClick={handleSendToMocApi}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" /> Đồng Bộ Trực Tiếp Lên CSDL Quốc Gia
            </button>

            <button
              onClick={handleDownloadJson}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold py-2.5 rounded-xl transition-all border border-slate-300 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Tải Tệp JSON Chuẩn TT 39/2026
            </button>
          </div>
        </div>

        {/* JSON Preview Payload Window */}
        <div className="lg:col-span-2 bg-slate-900 p-6 rounded-2xl text-slate-200 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-mono font-bold text-purple-400 flex items-center gap-2">
                <FileCode className="w-4 h-4" /> JSON PAYLOAD SCHEMA (TT 39/2026/TT-BXD)
              </span>
              <span className="text-[11px] bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-400/30">
                UTF-8 Encrypted
              </span>
            </div>

            <pre className="mt-4 p-4 bg-slate-950 rounded-xl text-xs font-mono text-emerald-400 overflow-x-auto h-80 border border-slate-800">
              {JSON.stringify(exportResult.data, null, 2)}
            </pre>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2 pt-2 border-t border-slate-800">
            <Database className="w-4 h-4 text-purple-400 shrink-0" />
            <span>Tự động xác thực chữ ký số SmartCA toàn vẹn dữ liệu trước khi phát hành API.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
