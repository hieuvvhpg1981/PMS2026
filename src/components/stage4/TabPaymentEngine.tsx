import React, { useState, useMemo } from 'react';
import { ProjectData } from '../../pms/T2_Services';
import { PmsHandlers } from '../../pms/T3_Handlers';
import { formatVND, safeNumber, validatePackageDisbursement, filterPaymentsByPackage, formatCurrencyInputMask, parseCurrencyInputMask, formatStatusOrCodeVN } from '../../pms/T1_Utils';
import {
  DollarSign,
  ShieldAlert,
  CheckCircle2,
  FileText,
  AlertCircle,
  PlusCircle,
  Pin,
  Eye,
  Layers,
  Building2,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { toast } from 'sonner';

interface TabPaymentEngineProps {
  project: ProjectData;
  selectedProjectId?: string;
  selectedPackageId: string;
  onRefreshData: () => void;
  onSelectPackage?: (packageId: string) => void;
}

export default function TabPaymentEngine({
  project,
  selectedProjectId,
  selectedPackageId,
  onRefreshData,
  onSelectPackage
}: TabPaymentEngineProps) {
  const [disbursementReqAmount, setDisbursementReqAmount] = useState<number>(5000000000);
  const [paymentDocType, setPaymentDocType] = useState<'MAU_01A' | 'MAU_03B'>('MAU_03B');
  const [paymentNote, setPaymentNote] = useState<string>('Thanh toán khối lượng hoàn thành đợt tiếp theo');

  const isAllPackages = useMemo(() => {
    return !selectedPackageId || selectedPackageId === 'ALL' || selectedPackageId === 'ALL_PACKAGES';
  }, [selectedPackageId]);

  // Packages list of current project
  const pkgList = useMemo(() => {
    return project.KHLCNT_ITEMS_GDA3 || [
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
    ];
  }, [project]);

  // Current single package details
  const selectedPackage = useMemo(() => {
    return pkgList.find(p => p.packageId === selectedPackageId) || pkgList[0];
  }, [pkgList, selectedPackageId]);

  const selectedPackageName = useMemo(() => {
    if (isAllPackages) return 'TẤT CẢ GÓI THẦU DỰ ÁN';
    return selectedPackage?.packageName || selectedPackageId;
  }, [isAllPackages, selectedPackage, selectedPackageId]);

  // Single Package Disbursement calculations
  const currentDisbursement = useMemo(() => {
    const disb = project.PACKAGE_DISBURSEMENTS_GDA4?.find(d => d.packageId === selectedPackageId);
    const contractValue = disb ? disb.contractValue : (selectedPackage ? (selectedPackage.winningPrice || selectedPackage.packagePrice) : 850000000000);
    const advanceAmount = disb ? disb.advanceAmount : (contractValue * 0.2);
    const cumulativePaid = disb ? disb.cumulativePaid : (contractValue * 0.52);
    const remainingLimit = Math.max(0, contractValue - cumulativePaid);

    return {
      packageId: selectedPackageId,
      contractValue,
      advanceAmount,
      cumulativePaid,
      remainingLimit,
      isHardBlocked: disb ? disb.isHardBlocked : false
    };
  }, [project, selectedPackageId, selectedPackage]);

  // Hard Block validation for single package
  const hardBlockCheck = useMemo(() => {
    return validatePackageDisbursement(
      selectedPackageId,
      currentDisbursement.contractValue,
      currentDisbursement.cumulativePaid,
      disbursementReqAmount
    );
  }, [selectedPackageId, currentDisbursement, disbursementReqAmount]);

  const paidPct = useMemo(() => {
    if (!currentDisbursement.contractValue) return 0;
    return Math.min(100, Number(((currentDisbursement.cumulativePaid / currentDisbursement.contractValue) * 100).toFixed(1)));
  }, [currentDisbursement]);

  // Filtered payments list
  const defaultPayments = [
    { PAYMENT_ID: 'PAY-01', PROJECT_ID: project.PROJECT_ID, packageId: 'GT-XL-01', CONTRACT_ID: 'HD-XL-01', DOT_THANH_TOAN: 1, GIA_TRI_DE_NGHI: 170000000000, KHOI_LUONG_LUY_KE_TRINH: 170000000000, NGAY_DE_NGHI: '2026-05-20', TRANG_THAI: 'ĐÃ_GIẢI_NGÂN' as const, SMART_CA_SIGNATURE: 'SmartCA Valid [ID: 991823]' },
    { PAYMENT_ID: 'PAY-02', PROJECT_ID: project.PROJECT_ID, packageId: 'GT-XL-01', CONTRACT_ID: 'HD-XL-01', DOT_THANH_TOAN: 2, GIA_TRI_DE_NGHI: 271300000000, KHOI_LUONG_LUY_KE_TRINH: 441300000000, NGAY_DE_NGHI: '2026-06-15', TRANG_THAI: 'ĐÃ_GIẢI_NGÂN' as const, SMART_CA_SIGNATURE: 'SmartCA Valid [ID: 882103]' },
    { PAYMENT_ID: 'PAY-03', PROJECT_ID: project.PROJECT_ID, packageId: 'GT-TV-01', CONTRACT_ID: 'HD-TV-01', DOT_THANH_TOAN: 1, GIA_TRI_DE_NGHI: 4350000000, KHOI_LUONG_LUY_KE_TRINH: 4350000000, NGAY_DE_NGHI: '2026-03-01', TRANG_THAI: 'ĐÃ_GIẢI_NGÂN' as const, SMART_CA_SIGNATURE: 'SmartCA Valid [ID: 771201]' }
  ];

  const filteredPayments = useMemo(() => {
    const rawList = (project.DE_NGHI_THANH_TOAN && project.DE_NGHI_THANH_TOAN.length > 0) ? project.DE_NGHI_THANH_TOAN : defaultPayments;
    return filterPaymentsByPackage(rawList, project.PROJECT_ID, selectedPackageId);
  }, [project, selectedPackageId]);

  // All Packages Summary calculation (for State B)
  const summaryPackages = useMemo(() => {
    return pkgList.map(pkg => {
      const disb = project.PACKAGE_DISBURSEMENTS_GDA4?.find(d => d.packageId === pkg.packageId);
      const cVal = disb ? disb.contractValue : (pkg.winningPrice || pkg.packagePrice || 14500000000);
      const adv = disb ? disb.advanceAmount : (cVal * 0.2);
      const paid = disb ? disb.cumulativePaid : (cVal * 0.5);
      const rem = Math.max(0, cVal - paid);
      const pct = cVal > 0 ? Number(((paid / cVal) * 100).toFixed(1)) : 0;

      return {
        packageId: pkg.packageId,
        packageName: pkg.packageName,
        contractor: pkg.winningContractor || 'Đơn vị thực hiện',
        contractValue: cVal,
        advanceAmount: adv,
        cumulativePaid: paid,
        remainingLimit: rem,
        disbursementPct: pct
      };
    });
  }, [pkgList, project]);

  const totalProjectSummary = useMemo(() => {
    const totalCVal = summaryPackages.reduce((acc, p) => acc + p.contractValue, 0);
    const totalAdv = summaryPackages.reduce((acc, p) => acc + p.advanceAmount, 0);
    const totalPaid = summaryPackages.reduce((acc, p) => acc + p.cumulativePaid, 0);
    const totalRem = summaryPackages.reduce((acc, p) => acc + p.remainingLimit, 0);
    const totalPct = totalCVal > 0 ? Number(((totalPaid / totalCVal) * 100).toFixed(1)) : 0;

    return {
      totalContractValue: totalCVal,
      totalAdvance: totalAdv,
      totalPaid,
      totalRemaining: totalRem,
      disbursementPct: totalPct
    };
  }, [summaryPackages]);

  const handleRequestDisbursement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hardBlockCheck.allowed) {
      toast.error(hardBlockCheck.message);
      return;
    }

    const targetPkgId = isAllPackages ? 'GT-XL-01' : selectedPackageId;
    const res = PmsHandlers.stage4PackageDisbursementApi(project.PROJECT_ID, targetPkgId, disbursementReqAmount);

    if (res.success) {
      toast.success(res.message);
      onRefreshData();
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* 📌 CONTEXT BADGE AT TOP OF TAB */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 text-xs">
          <Pin className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="text-slate-700 font-semibold">
            Đang quản lý thanh toán cho: <strong className="text-slate-900 font-extrabold">Dự án <span className="font-mono tabular-nums">[{project.PROJECT_ID}]</span> {project.TEN_DU_AN}</strong> ➔ <strong className="text-indigo-700 font-extrabold">{selectedPackageName}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${currentDisbursement.isHardBlocked ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
            {currentDisbursement.isHardBlocked ? 'Tạm khóa (Hard-blocked)' : 'Bình thường'}
          </span>
        </div>
      </div>

      {/* STATE A: SINGLE PACKAGE SELECTED */}
      {!isAllPackages && (
        <>
          {/* FINANCIAL MINI DASHBOARD FOR SINGLE PACKAGE */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Bảng theo dõi tạm ứng & giải ngân gói thầu <span className="font-mono tabular-nums">[{selectedPackageId}]</span>
              </h3>
              <span className="text-xs text-slate-500 font-mono tabular-nums">Căn cứ NĐ 206/2026 & TT 38/2026</span>
            </div>

            {/* Progress Bar Visualizing Disbursement */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600">Tiến độ giải ngân thực tế gói {selectedPackageId}</span>
                <span className="font-mono tabular-nums text-emerald-700">{paidPct}% ({formatVND(currentDisbursement.cumulativePaid)} / {formatVND(currentDisbursement.contractValue)})</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden border border-slate-200 flex">
                <div className="bg-emerald-600 h-full transition-all duration-500 rounded-full" style={{ width: `${paidPct}%` }}></div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-medium pt-2">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="text-slate-500 font-semibold">Giá trị hợp đồng gói</div>
                <div className="font-mono tabular-nums text-base font-extrabold text-indigo-950">{formatVND(currentDisbursement.contractValue)}</div>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="text-slate-500 font-semibold">Lũy kế tạm ứng</div>
                <div className="font-mono tabular-nums text-base font-extrabold text-purple-700">{formatVND(currentDisbursement.advanceAmount)}</div>
              </div>
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
                <div className="text-emerald-800 font-semibold">Lũy kế thanh toán KLHT</div>
                <div className="font-mono tabular-nums text-base font-extrabold text-emerald-700">{formatVND(currentDisbursement.cumulativePaid)}</div>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="text-slate-500 font-semibold">Giá trị còn lại (Hạn mức)</div>
                <div className="font-mono tabular-nums text-base font-extrabold text-slate-900">{formatVND(currentDisbursement.remainingLimit)}</div>
              </div>
            </div>
          </div>

          {/* HARD BLOCK GUARDRAIL ALERT & FORM */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText className="w-5 h-5 text-indigo-600" />
              Tạo hồ sơ đề nghị thanh toán Kho bạc mới (Mẫu 01a / 03b) - Gói <span className="font-mono tabular-nums">[{selectedPackageId}]</span>
            </h3>

            {!hardBlockCheck.allowed && (
              <div className="bg-red-50 border-2 border-red-200 p-4 rounded-xl text-red-900 text-xs font-bold flex items-center gap-3 animate-pulse">
                <ShieldAlert className="w-6 h-6 text-red-600 shrink-0" />
                <div>
                  <div className="text-sm font-extrabold text-red-800">🚫 Hard block gói thầu [{selectedPackageId}]: Đề nghị giải ngân vượt hạn mức!</div>
                  <div>{hardBlockCheck.message}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleRequestDisbursement} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mẫu hồ sơ gửi Kho bạc</label>
                  <select
                    value={paymentDocType}
                    onChange={e => setPaymentDocType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none font-semibold text-sm"
                  >
                    <option value="MAU_03B">Mẫu 03b - Khối lượng hoàn thành thanh toán</option>
                    <option value="MAU_01A">Mẫu 01a - Bảng xác định giá trị khối lượng công việc</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Số tiền đề nghị giải ngân (VNĐ)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatCurrencyInputMask(disbursementReqAmount)}
                    onChange={e => setDisbursementReqAmount(parseCurrencyInputMask(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-mono tabular-nums font-extrabold text-indigo-950 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú đợt thanh toán</label>
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={e => setPaymentNote(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={!hardBlockCheck.allowed}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-6 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-40"
                >
                  <CheckCircle2 className="w-4 h-4" /> Ký số SmartCA & gửi Kho bạc Nhà nước
                </button>
              </div>
            </form>
          </div>

          {/* PAYMENT HISTORY TABLE FOR SINGLE PACKAGE */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex justify-between items-center">
              <span>Lịch sử hồ sơ giải ngân đã thực hiện - Gói <span className="font-mono tabular-nums">[{selectedPackageId}]</span></span>
              <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-semibold tabular-nums">
                {filteredPayments.length} đợt thanh toán
              </span>
            </h3>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left text-slate-600 border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-3">Mã hồ sơ</th>
                    <th className="px-3.5 py-3 text-center">Đợt thanh toán</th>
                    <th className="px-3.5 py-3 text-right">Giá trị đề nghị (VNĐ)</th>
                    <th className="px-3.5 py-3 text-right">Lũy kế đã trình (VNĐ)</th>
                    <th className="px-3.5 py-3">Ngày trình</th>
                    <th className="px-3.5 py-3 text-center">Xác thực SmartCA</th>
                    <th className="px-3.5 py-3 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium bg-white">
                  {filteredPayments.map(pay => (
                    <tr key={pay.PAYMENT_ID} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3.5 py-3 font-mono tabular-nums font-bold text-indigo-700">{pay.PAYMENT_ID}</td>
                      <td className="px-3.5 py-3 font-bold text-center font-mono tabular-nums">Đợt {pay.DOT_THANH_TOAN}</td>
                      <td className="px-3.5 py-3 text-right font-mono tabular-nums font-bold text-slate-900">{formatVND(pay.GIA_TRI_DE_NGHI)}</td>
                      <td className="px-3.5 py-3 text-right font-mono tabular-nums font-bold text-emerald-700">{formatVND(pay.KHOI_LUONG_LUY_KE_TRINH)}</td>
                      <td className="px-3.5 py-3 font-mono tabular-nums">{pay.NGAY_DE_NGHI}</td>
                      <td className="px-3.5 py-3 text-center font-mono tabular-nums text-[11px] text-indigo-700 bg-indigo-50 font-semibold rounded">
                        {pay.SMART_CA_SIGNATURE || 'SmartCA Signed'}
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        <span className="bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-full text-[11px]">
                          {formatStatusOrCodeVN(pay.TRANG_THAI)}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {filteredPayments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-slate-400">
                        Chưa có lịch sử giải ngân nào cho gói thầu {selectedPackageId}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* STATE B: ALL PACKAGES SELECTED ([TẤT CẢ GÓI THẦU]) */}
      {isAllPackages && (
        <>
          {/* TOTAL DISBURSEMENT DASHBOARD FOR ALL PACKAGES */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Tổng hợp giải ngân toàn bộ các gói thầu - Dự án <span className="font-mono tabular-nums">[{project.PROJECT_ID}]</span>
              </h3>
              <span className="text-xs bg-indigo-50 text-indigo-800 font-semibold px-3 py-1 rounded-full border border-indigo-200 tabular-nums">
                {summaryPackages.length} gói thầu
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600">Tỷ lệ giải ngân tổng hợp toàn bộ gói thầu</span>
                <span className="font-mono tabular-nums text-emerald-700">{totalProjectSummary.disbursementPct}% ({formatVND(totalProjectSummary.totalPaid)} / {formatVND(totalProjectSummary.totalContractValue)})</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden border border-slate-200 flex">
                <div className="bg-emerald-600 h-full transition-all duration-500 rounded-full" style={{ width: `${totalProjectSummary.disbursementPct}%` }}></div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-medium pt-2">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="text-slate-500 font-semibold">Tổng giá trị HĐ các gói</div>
                <div className="font-mono tabular-nums text-base font-extrabold text-indigo-950">{formatVND(totalProjectSummary.totalContractValue)}</div>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="text-slate-500 font-semibold">Tổng lũy kế tạm ứng</div>
                <div className="font-mono tabular-nums text-base font-extrabold text-purple-700">{formatVND(totalProjectSummary.totalAdvance)}</div>
              </div>
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
                <div className="text-emerald-800 font-semibold">Tổng lũy kế giải ngân</div>
                <div className="font-mono tabular-nums text-base font-extrabold text-emerald-700">{formatVND(totalProjectSummary.totalPaid)}</div>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="text-slate-500 font-semibold">Tổng hạn mức còn lại</div>
                <div className="font-mono tabular-nums text-base font-extrabold text-slate-900">{formatVND(totalProjectSummary.totalRemaining)}</div>
              </div>
            </div>
          </div>

          {/* ALL PACKAGES SUMMARY TABLE */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex justify-between items-center">
              <span className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-600" /> Bảng tổng hợp thanh toán các gói thầu thuộc dự án
              </span>
            </h3>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left text-slate-600 border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-3 min-w-[100px]">Mã gói</th>
                    <th className="px-3.5 py-3 min-w-[260px]">Tên gói thầu & nhà thầu</th>
                    <th className="px-3.5 py-3 text-right min-w-[140px]">Giá trị HĐ (VNĐ)</th>
                    <th className="px-3.5 py-3 text-right min-w-[130px]">Lũy kế tạm ứng</th>
                    <th className="px-3.5 py-3 text-right min-w-[140px]">Lũy kế thanh toán</th>
                    <th className="px-3.5 py-3 text-right min-w-[130px]">Giá trị còn lại</th>
                    <th className="px-3.5 py-3 text-center min-w-[110px]">Giải ngân (%)</th>
                    <th className="px-3.5 py-3 text-center min-w-[110px]">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium bg-white">
                  {summaryPackages.map(pkg => (
                    <tr key={pkg.packageId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3.5 py-3 font-mono tabular-nums font-bold text-indigo-950">{pkg.packageId}</td>
                      <td className="px-3.5 py-3">
                        <div className="font-semibold text-slate-900">{pkg.packageName}</div>
                        <div className="text-[11px] text-slate-500">Nhà thầu: {pkg.contractor}</div>
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono tabular-nums font-bold text-slate-900">{formatVND(pkg.contractValue)}</td>
                      <td className="px-3.5 py-3 text-right font-mono tabular-nums text-purple-700">{formatVND(pkg.advanceAmount)}</td>
                      <td className="px-3.5 py-3 text-right font-mono tabular-nums font-bold text-emerald-700">{formatVND(pkg.cumulativePaid)}</td>
                      <td className="px-3.5 py-3 text-right font-mono tabular-nums text-slate-700">{formatVND(pkg.remainingLimit)}</td>
                      <td className="px-3.5 py-3 text-center">
                        <span className="bg-emerald-100 text-emerald-900 font-mono tabular-nums font-extrabold px-2.5 py-1 rounded-full text-[11px]">
                          {pkg.disbursementPct}%
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        {onSelectPackage && (
                          <button
                            onClick={() => onSelectPackage(pkg.packageId)}
                            className="px-3 py-1.5 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-all text-xs font-medium shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5 inline mr-1" /> Chi tiết
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
