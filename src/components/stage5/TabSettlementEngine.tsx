import React, { useState } from 'react';
import { ProjectData } from '../../pms/T2_Services';
import { formatVND, calculateSettlementBalance, generateQuyetToan193ReportExcel, filterClosureDataByScope } from '../../pms/T1_Utils';
import {
  FileSpreadsheet,
  CheckCircle,
  FileCheck2,
  Receipt,
  Printer,
  ShieldCheck,
  Building2,
  DollarSign,
  AlertCircle,
  Download
} from 'lucide-react';
import { toast } from 'sonner';

interface TabSettlementEngineProps {
  currentProject: ProjectData;
  selectedPackageId: string;
  onUpdateProject: (updated: ProjectData) => void;
}

export default function TabSettlementEngine({
  currentProject,
  selectedPackageId,
  onUpdateProject
}: TabSettlementEngineProps) {
  const contractItems = (currentProject.KHLCNT_ITEMS_GDA3 || [
    {
      packageId: 'GT-TV-01',
      packageName: 'Gói thầu TV-01: Tư vấn Khảo sát địa chất & Thiết kế BVTC',
      packagePrice: 15000000000,
      winningContractor: 'Tổng Công ty Tư vấn Thiết kế TEDI',
      winningPrice: 14500000000,
      status: 'ĐÃ_KÝ_HỢP_ĐỒNG'
    },
    {
      packageId: 'GT-XL-01',
      packageName: 'Gói thầu XL-01: Thi công Xây lắp Cầu & Đường dẫn',
      packagePrice: 880000000000,
      winningContractor: 'Tập đoàn Xây dựng Đèo Cả - Vinaconex',
      winningPrice: 850000000000,
      status: 'ĐÃ_KÝ_HỢP_ĐỒNG'
    },
    {
      packageId: 'GT-TB-01',
      packageName: 'Gói thầu TB-01: Cung cấp & Lắp đặt Thiết bị cẩu dầm',
      packagePrice: 30000000000,
      winningContractor: 'Công ty Cổ phần Thiết bị Xây dựng FECON',
      winningPrice: 29000000000,
      status: 'ĐÃ_KÝ_HỢP_ĐỒNG'
    }
  ]).map(item => ({ ...item, projectId: currentProject.PROJECT_ID }));

  const filteredContracts = filterClosureDataByScope(contractItems, currentProject.PROJECT_ID, selectedPackageId);
  const pkgDisbursements = currentProject.PACKAGE_DISBURSEMENTS_GDA4 || [];

  const [showLiquidationModal, setShowLiquidationModal] = useState(false);
  const [selectedContractForLiquidation, setSelectedContractForLiquidation] = useState<any | null>(null);

  const handleExportQuyetToan193 = () => {
    generateQuyetToan193ReportExcel(currentProject.PROJECT_ID, currentProject);
    toast.success(`Đã tự động xuất Báo cáo Tổng hợp Quyết toán Vốn Dự án ${currentProject.PROJECT_ID} (Chuẩn Mẫu 01/QT-ND193)!`);
  };

  const handleOpenLiquidationModal = (contract: any) => {
    setSelectedContractForLiquidation(contract);
    setShowLiquidationModal(true);
  };

  const handleConfirmLiquidation = () => {
    if (!selectedContractForLiquidation) return;
    toast.success(`Đã ký phê duyệt Biên bản Thanh lý Hợp đồng kinh tế Gói thầu ${selectedContractForLiquidation.packageId} theo chuẩn NĐ 210/2026/NĐ-CP!`);
    setShowLiquidationModal(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. PHÂN HỆ ONE-CLICK QUYẾT TOÁN VỐN DỰ ÁN (CẤP DỰ ÁN) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              Báo cáo tổng hợp quyết toán vốn đầu tư công (NĐ 193/2026/NĐ-CP)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Chuẩn Mẫu 01/QT-ND193 | Tự động tổng hợp số liệu giải ngân Kho bạc Nhà nước từ Stage 4
            </p>
          </div>

          <button
            onClick={handleExportQuyetToan193}
            className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Xuất báo cáo quyết toán Kho bạc (Excel)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="text-slate-500 font-medium">1. Tổng mức đầu tư được duyệt:</div>
            <div className="font-mono tabular-nums font-extrabold text-base text-slate-900">
              {formatVND(currentProject.TONG_MUC_DAU_TU || 950000000000)}
            </div>
            <div className="text-[11px] text-slate-400">Quyết định duyệt Chủ trương ĐT</div>
          </div>

          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
            <div className="text-emerald-800 font-medium">2. Giá trị đã giải ngân lũy kế Kho bạc:</div>
            <div className="font-mono tabular-nums font-extrabold text-base text-emerald-900">
              {formatVND(currentProject.LUY_KE_GIAI_NGAN || 450000000000)}
            </div>
            <div className="text-[11px] text-emerald-700">Tự động tổng hợp từ GĐ 4</div>
          </div>

          <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200 space-y-1">
            <div className="text-indigo-800 font-medium">3. Giá trị đề nghị quyết toán thực tế:</div>
            <div className="font-mono tabular-nums font-extrabold text-base text-indigo-900">
              {formatVND(currentProject.LUY_KE_GIAI_NGAN || 450000000000)}
            </div>
            <div className="text-[11px] text-indigo-700 tabular-nums">Tiết kiệm: {formatVND((currentProject.TONG_MUC_DAU_TU || 950000000000) - (currentProject.LUY_KE_GIAI_NGAN || 450000000000))}</div>
          </div>
        </div>
      </div>

      {/* 2. PHÂN HỆ QUYẾT TOÁN & THANH LÝ HỢP ĐỒNG (THEO GÓI THẦU) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-600" />
            Đối chiếu quyết toán & biên bản thanh lý hợp đồng kinh tế (theo gói thầu)
          </h3>
          <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-bold tabular-nums">
            {filteredContracts.length} gói thầu
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="p-3.5 min-w-[100px]">Mã gói thầu</th>
                <th className="p-3.5 min-w-[260px]">Tên gói thầu & Nhà thầu trúng thầu</th>
                <th className="p-3.5 text-right min-w-[140px]">Giá trị hợp đồng</th>
                <th className="p-3.5 text-right min-w-[140px]">Giá trị đã trả</th>
                <th className="p-3.5 text-right min-w-[140px]">Giữ lại bảo hành (5%)</th>
                <th className="p-3.5 text-right min-w-[150px]">Cần thanh toán cuối</th>
                <th className="p-3.5 text-center min-w-[140px]">Thanh lý hợp đồng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredContracts.map(contract => {
                const disb = pkgDisbursements.find(d => d.packageId === contract.packageId);
                const winPrice = disb ? disb.contractValue : (contract.winningPrice || contract.packagePrice || 14500000000);
                const paid = disb ? disb.cumulativePaid : (winPrice * 0.9);
                const settlement = calculateSettlementBalance(winPrice, paid, 0.05);

                return (
                  <tr key={contract.packageId} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-mono tabular-nums font-bold text-indigo-900">{contract.packageId}</td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{contract.packageName}</div>
                      <div className="text-[11px] text-slate-500 font-medium">Nhà thầu: {contract.winningContractor}</div>
                    </td>
                    <td className="p-3.5 text-right font-mono tabular-nums font-bold text-slate-900">
                      {formatVND(settlement.contractValue)}
                    </td>
                    <td className="p-3.5 text-right font-mono tabular-nums text-emerald-700">
                      {formatVND(settlement.actualPaid)}
                    </td>
                    <td className="p-3.5 text-right font-mono tabular-nums text-amber-700 font-bold">
                      {settlement.formattedRetention}
                    </td>
                    <td className="p-3.5 text-right font-mono tabular-nums font-extrabold text-indigo-900">
                      {settlement.formattedRemaining}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleOpenLiquidationModal(contract)}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-600 hover:text-white transition-all font-semibold text-xs shadow-2xs"
                      >
                        📜 Thanh lý HĐ
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Thanh Lý Hợp Đồng */}
      {showLiquidationModal && selectedContractForLiquidation && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-indigo-600" />
                Biên bản thanh lý hợp đồng kinh tế (Quyết toán gói thầu)
              </h4>
              <button onClick={() => setShowLiquidationModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono tabular-nums">
              <div className="text-center font-bold text-sm text-slate-900 border-b border-slate-200 pb-2">
                CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br />
                Độc lập - Tự do - Hạnh phúc
              </div>

              <div className="space-y-1 text-slate-800">
                <div>📌 Gói thầu: <strong className="text-indigo-900">{selectedContractForLiquidation.packageName}</strong></div>
                <div>🏢 Bên A (Chủ đầu tư): Ban QLDA Đầu tư Xây dựng Công trình Giao thông</div>
                <div>🏗️ Bên B (Nhà thầu): {selectedContractForLiquidation.winningContractor}</div>
                <div>💰 Giá trị Hợp đồng gốc: {formatVND(selectedContractForLiquidation.winningPrice || selectedContractForLiquidation.packagePrice)}</div>
                <div>🔒 Tiền bảo hành giữ lại (5%): {formatVND((selectedContractForLiquidation.winningPrice || selectedContractForLiquidation.packagePrice) * 0.05)}</div>
                <div>✅ Hai bên thống nhất tất toán & thanh lý hợp đồng theo quy định tại Nghị định 210/2026/NĐ-CP.</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowLiquidationModal(false)}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl"
              >
                Đóng
              </button>
              <button
                onClick={handleConfirmLiquidation}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" /> Ký số SmartCA & phê duyệt thanh lý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
